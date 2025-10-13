// ==============================
// 🧭 DireccionPickerComponent.ts
// ==============================

import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonModal } from '@ionic/angular';
import { UbicacionService, UbicacionResultado } from 'src/app/services/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { Store } from '@ngxs/store';
import { ClearUbicacionUsuario, SetUbicacionUsuario, UsuarioState } from 'src/app/states/usuario.state';
import { Keyboard } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';
import { Subject, Subscription, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-direccion-picker',
  templateUrl: './direccion-picker.component.html',
  styleUrls: ['./direccion-picker.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DireccionPickerComponent implements OnInit, OnDestroy {
  @Output() ciudadSeleccionada = new EventEmitter<string | null>();

  abierto = false;
  query = '';
  predicciones: string[] = [];
  ciudadActual: string | null = null;
  direccionActual: string | null = null;
  calleNumero: string | null = null; // lo que se pinta junto a la ciudad (vía+num) o "(Centro)"
  direccionCompacta = false;
  mostrarNoResultados = false; // Control para mostrar "No hay resultados"
  
  private ultimaPrediccionTimestamp = 0; // Timestamp de la última predicción
  private noResultadosTimeout: any = null; // Timeout para mostrar "No hay resultados"

  @ViewChild('direccionEl') direccionEl?: ElementRef<HTMLDivElement>;
  @ViewChild(IonModal) modal?: IonModal;

  breakpoints: number[] = [0, 0.5, 1];
  initialBreakpoint = 0.5;

  private queryChanged = new Subject<string>();
  private querySub?: Subscription;

  // Cambia a handles reales (no Promises)
  private kbShowSub?: PluginListenerHandle;
  private kbHideSub?: PluginListenerHandle;

  // Constante configurable para el tiempo de espera (en milisegundos)
  private readonly TIEMPO_ESPERA_NO_RESULTADOS = 2000; // 1 segundo

  constructor(
    private ubicacionService: UbicacionService, 
    private store: Store,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    const ubicacion = this.store.selectSnapshot(UsuarioState.ubicacion);
    if (ubicacion?.ciudad) {
      this.ciudadActual = ubicacion.ciudad;
    }

    if (ubicacion?.direccion) {
      this.direccionActual = ubicacion.direccion;
      this.updateCalleNumeroFromDireccion({
        direccion: ubicacion.direccion,
        ciudad: ubicacion.ciudad || null,
        lat: ubicacion.lat ?? null,
        lng: ubicacion.lng ?? null
      } as any as UbicacionResultado);
    } else if (this.ciudadActual) {
      this.calleNumero = '(Centro)';
    }

    setTimeout(() => this.ajustarTamanoDireccion(), 0);

    this.querySub = this.queryChanged.pipe(
      // ⚠️ sin debounce ni distinct: el backend ya coalescea por sesión
      switchMap((raw: string) => {
        // evita 400 si está vacío; el resto lo decide el backend
        if (raw == null || raw === '') {
          this.predicciones = [];
          return of<string[]>([]);
        }
        return this.ubicacionService.autocomplete(raw);
      })
    ).subscribe((res) => {
      // Ejecutamos dentro de NgZone y forzamos detección de cambios
      this.ngZone.run(() => {
        // Solo actualizamos las predicciones si hay resultados
        if (res && res.length > 0) {
          this.predicciones = res;
          this.ultimaPrediccionTimestamp = Date.now();
          this.mostrarNoResultados = false;
          
          // Cancelamos cualquier timeout pendiente de "no resultados"
          if (this.noResultadosTimeout) {
            clearTimeout(this.noResultadosTimeout);
            this.noResultadosTimeout = null;
          }
          
          console.log('Actualizando predicciones en UI:', this.predicciones);
        } else if (res && res.length === 0) {
          // Si no hay resultados, programamos mostrar "No hay resultados" después del tiempo configurado
          if (this.noResultadosTimeout) {
            clearTimeout(this.noResultadosTimeout);
          }
          
          this.noResultadosTimeout = setTimeout(() => {
            this.ngZone.run(() => {
              // Solo actualizamos si ha pasado el tiempo configurado sin nuevas predicciones
              if (Date.now() - this.ultimaPrediccionTimestamp >= this.TIEMPO_ESPERA_NO_RESULTADOS) {
                this.predicciones = [];
                this.mostrarNoResultados = true;
                console.log(`Mostrando "No hay resultados" tras ${this.TIEMPO_ESPERA_NO_RESULTADOS/1000}s`);
                this.cdr.detectChanges();
              }
            });
          }, this.TIEMPO_ESPERA_NO_RESULTADOS);
        }
        this.cdr.detectChanges();
      });
    });

    // Escuchar teclado y expandir al 100%
    Keyboard.addListener('keyboardDidShow', (e) => {
      document.documentElement.style.setProperty('--kb-height', `${e.keyboardHeight}px`);
      this.modal?.setCurrentBreakpoint(1); // 100%
    }).then(h => this.kbShowSub = h);

    Keyboard.addListener('keyboardDidHide', () => {
      document.documentElement.style.setProperty('--kb-height', `0px`);
      this.modal?.setCurrentBreakpoint(this.initialBreakpoint);
    }).then(h => this.kbHideSub = h);
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
    // remove() devuelve Promise; no es necesario await aquí
    this.kbShowSub?.remove();
    this.kbHideSub?.remove();
    
    // Limpiamos el timeout si existe
    if (this.noResultadosTimeout) {
      clearTimeout(this.noResultadosTimeout);
    }
  }

  togglePanel() {
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.query = '';
      this.predicciones = [];
      this.mostrarNoResultados = false;
    } else {
      this.predicciones = [];
      this.mostrarNoResultados = false;
    }
  }

  onModalDismiss() {
    this.abierto = false;
    this.query = '';
    this.predicciones = [];
    this.mostrarNoResultados = false;
    
    // Limpiamos el timeout si existe
    if (this.noResultadosTimeout) {
      clearTimeout(this.noResultadosTimeout);
      this.noResultadosTimeout = null;
    }
  }

  buscar() {
    console.log('Buscando:', this.query);
    
    // Reiniciamos el estado de no resultados al buscar
    if (this.noResultadosTimeout) {
      clearTimeout(this.noResultadosTimeout);
      this.noResultadosTimeout = null;
    }
    this.mostrarNoResultados = false;
    
    this.queryChanged.next(this.query);
  }

  seleccionar(prediccion: string) {
    this.ubicacionService.geocode(prediccion).subscribe({
      next: (res: UbicacionResultado) => {
        this.direccionActual = res.direccion;
        this.ciudadActual = res.ciudad;
        this.query = res.direccion;
        this.abierto = false;
        this.predicciones = [];

        this.updateCalleNumeroFromDireccion(res);

        this.store.dispatch(new SetUbicacionUsuario({
          direccion: res.direccion,
          ciudad: res.ciudad,
          lat: res.lat,
          lng: res.lng
        }));
        this.ciudadSeleccionada.emit(res.ciudad);
      },
      error: (err) => {
        console.error('Error geocodificando:', err);
        alert('No se pudo obtener la ciudad desde la dirección.');
      }
    });
  }

  async usarMiUbicacion() {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted') {
        alert('Se necesita permiso de geolocalización para usar esta función.');
        return;
      }
      const pos = await Geolocation.getCurrentPosition();
      this.ubicacionService.reverseGeocode(pos.coords.latitude, pos.coords.longitude).subscribe({
        next: (res: UbicacionResultado) => {
          this.direccionActual = res.direccion;
          this.ciudadActual = res.ciudad;
          this.query = res.direccion;
          this.ciudadSeleccionada.emit(res.ciudad);
          this.abierto = false;
          this.predicciones = [];

          this.updateCalleNumeroFromDireccion(res);

          this.store.dispatch(new SetUbicacionUsuario({
            direccion: res.direccion,
            ciudad: res.ciudad,
            lat: res.lat,
            lng: res.lng
          }));
        },
        error: (err) => {
          console.error('Error geolocalización backend:', err);
          alert('No se pudo obtener la ciudad desde tu ubicación.');
        }
      });
    } catch (err) {
      console.error('Error obteniendo ubicación del dispositivo:', err);
      alert('No se pudo acceder al GPS. Verificá permisos.');
    }
  }

  borrar() {
    this.ciudadActual = null;
    this.direccionActual = null;
    this.query = '';
    this.predicciones = [];
    this.abierto = false;
    this.ciudadSeleccionada.emit(null);
    this.store.dispatch(new ClearUbicacionUsuario());
    this.calleNumero = null;
    this.direccionCompacta = false;
  }

  // ===== Autocomplete: SIN formateo =====
  highlight(texto: string): string {
    return texto; // exacto del backend
  }

  // =========================
  // 🔽 Formateo del “chip” (vía + número) con fallback "(Centro)" desde 'direccion'
  // =========================

  private normalizeBasic(s?: string | null): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private segEsCiudad(seg?: string | null, ciudad?: string | null): boolean {
    if (!seg || !ciudad) {
      return false;
    }
    return this.normalizeBasic(seg) === this.normalizeBasic(ciudad);
  }

  private firstSegment(addr?: string | null): string | null {
    if (!addr) {
      return null;
    }
    const partes = addr.split(',');
    return partes.length > 0 ? partes[0].trim() : null;
  }


  // Construye "calle abreviada + número" o "(Centro)" desde res.direccion y res.ciudad
  private formatCalleNumero(res: UbicacionResultado): string {
    // Si no hay datos necesarios, devolver (Centro)
    if (!res || !res.direccion) {
      return '(Centro)';
    }
    
    // Si tenemos los campos específicos, usarlos
    if (res.via_tipo && res.via_nombre) {
      const viaFormateada = `${res.via_tipo} ${res.via_nombre}`;
      return res.numero ? `${viaFormateada}, ${res.numero}` : viaFormateada;
    }
    
    // Si no, intentar extraer de la dirección completa
    const partes = res.direccion.split(',');
    if (partes.length > 1) {
      // Asumimos que la primera parte es la calle y número
      return partes[0].trim();
    }
    
    // Si todo falla, devolver un fragmento de la dirección
    return res.direccion.length > 30 ? 
      res.direccion.substring(0, 30) + '...' : 
      res.direccion;
  }

  // Implementar el método updateCalleNumeroFromDireccion
  private updateCalleNumeroFromDireccion(res: UbicacionResultado): void {
    // Si no hay dirección, usar (Centro)
    if (!res.direccion) {
      this.calleNumero = '(Centro)';
      return;
    }

    // Si hay dirección, usar el formateo
    this.calleNumero = this.formatCalleNumero(res);
    
    // Ajustar tamaño después de actualizar
    setTimeout(() => this.ajustarTamanoDireccion(), 0);
  }

  // Implementar el método ajustarTamanoDireccion
  private ajustarTamanoDireccion(): void {
    if (!this.direccionEl || !this.calleNumero) return;
    
    const el = this.direccionEl.nativeElement;
    const parentWidth = el.parentElement?.clientWidth;
    
    if (!parentWidth) return;
    
    // Si el ancho del elemento es mayor que el contenedor, activar modo compacto
    this.direccionCompacta = el.scrollWidth > parentWidth * 0.8;
  }
}
