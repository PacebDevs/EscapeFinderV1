// ==============================
// 🧭 DireccionPickerComponent.ts
// ==============================

import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, IonModal } from '@ionic/angular';
import { UbicacionService, UbicacionResultado } from 'src/app/services/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { ClearUbicacionUsuario, SetUbicacionUsuario, UsuarioState } from 'src/app/states/usuario.state';
import { Keyboard } from '@capacitor/keyboard';
import { PluginListenerHandle } from '@capacitor/core';

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

  @ViewChild('direccionEl') direccionEl?: ElementRef<HTMLDivElement>;
  @ViewChild(IonModal) modal?: IonModal;

  breakpoints: number[] = [0, 0.5, 1];
  initialBreakpoint = 0.5;

  private queryChanged = new Subject<string>();
  private querySub?: Subscription;

  // Cambia a handles reales (no Promises)
  private kbShowSub?: PluginListenerHandle;
  private kbHideSub?: PluginListenerHandle;

  constructor(private ubicacionService: UbicacionService, private store: Store) {}

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

    this.querySub = this.queryChanged
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => {
        if (!texto.trim()) {
          this.predicciones = [];
          return;
        }
        this.ubicacionService.autocomplete(texto.trim()).subscribe((res) => {
          this.predicciones = res || [];
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
  }

  togglePanel() {
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.query = '';
      this.predicciones = [];
    } else {
      this.predicciones = [];
    }
  }

  onModalDismiss() {
    this.abierto = false;
    this.query = '';
    this.predicciones = [];
  }

  buscar() {
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
    if (!seg || !ciudad) return false;
    return this.normalizeBasic(seg) === this.normalizeBasic(ciudad);
  }

  private firstSegment(addr?: string | null): string | null {
    if (!addr) return null;
    const seg = addr.split(',')[0]?.trim() || '';
    return seg || null;
  }

  // Abreviador
  private normalizeToken(s: string): string {
    return (s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, '');
  }

  private abreviarToken(token: string): string {
    const k = this.normalizeToken(token);
    switch (k) {
      case 'calle': case 'c': case 'c/': return 'C/';
      case 'avenida': case 'avda': case 'av': return 'Avda.';
      case 'paseo': case 'pº': case 'ps': return 'Pº';
      case 'plaza': case 'pl': return 'Pl.';
      case 'camino': case 'cmno': return 'Cno.';
      case 'carretera': case 'ctra': return 'Ctra.';
      case 'ronda': return 'Rda.';
      case 'travesia': case 'trav': return 'Trva.';
      case 'bulevar': case 'boulevard': case 'blvr': return 'Blvr';
      case 'pasaje': case 'pje': return 'Pje.';
      case 'glorieta': case 'gta': return 'Gta.';
      case 'via': return 'Vía';
      case 'carrer': return 'C/';
      case 'passeig': case 'pg': return 'Pº';
      default:
        return token.charAt(0).toUpperCase() + token.slice(1);
    }
  }

  // Detecta el tipo de vía en el inicio y lo abrevia. Devuelve "C/ Pizarro" o null.
  private abreviarDesdeVia(viaCompleta: string): string | null {
    const re = /^\s*(c\/|c\.|calle|avenida|avda\.?|av\.?|paseo|pº|ps\.?|plaza|pl\.?|camino|carretera|ctra\.?|ronda|v[íi]a|traves[íi]a|trav\.?|bulevar|boulevard|blvr|carrer|passeig|pg|pasaje|pje\.?|glorieta|gta\.?)\s+(de\s+|del\s+|la\s+|los\s+|las\s+)?(.+)$/i;
    const m = viaCompleta.match(re);
    if (!m) return null;
    const token = m[1];
    const resto = m[3].trim();
    const abbr = this.abreviarToken(token);
    return `${abbr} ${resto}`.trim();
  }

  // Extrae número de la dirección (fin del primer tramo o inicio del segundo), evitando CP de 5 dígitos
  private extraerNumero(direccion?: string | null): string | null {
    if (!direccion) return null;
    const partes = direccion.split(',').map(p => p.trim()).filter(Boolean);
    const seg1 = partes[0] || '';
    const seg2 = partes[1] || '';

    // número al final del primer segmento
    const m1 = seg1.match(/(\d+[A-Za-zºª\-\/]?)\s*$/);
    if (m1) return m1[1];

    // número al inicio del segundo segmento (evitar CP 5 dígitos)
    const m2 = seg2.match(/^(\d+[A-Za-zºª\-\/]?)(?!\d)\b/);
    if (m2 && !/^\d{5}$/.test(m2[1])) return m2[1];

    return null;
  }

  // Construye "calle abreviada + número" o "(Centro)" desde res.direccion y res.ciudad
  private formatCalleNumero(res: UbicacionResultado): string {
    const seg = this.firstSegment(res.direccion);
    if (!seg) return '(Centro)';
    if (this.segEsCiudad(seg, res.ciudad)) return '(Centro)';

    const principal = this.abreviarDesdeVia(seg) || seg;
    const yaTieneNumero = /\b\d/.test(principal);
    const numero = this.extraerNumero(res.direccion);

    return (!yaTieneNumero && numero) ? `${principal} ${numero}`.trim() : principal;
  }

  // Aplica el formateo y actualiza el chip superior
  private updateCalleNumeroFromDireccion(res?: UbicacionResultado) {
    if (res) {
      this.calleNumero = this.formatCalleNumero(res) || '(Centro)';
    } else {
      const seg = this.firstSegment(this.direccionActual);
      this.calleNumero = this.segEsCiudad(seg, this.ciudadActual)
        ? '(Centro)'
        : (seg || (this.ciudadActual ? '(Centro)' : null));
    }
    setTimeout(() => this.ajustarTamanoDireccion(), 0);
  }

  private ajustarTamanoDireccion() {
    const el = this.direccionEl?.nativeElement;
    if (!el) { this.direccionCompacta = false; return; }
    const overflow = el.scrollWidth > el.clientWidth + 1;
    this.direccionCompacta = overflow;
  }
}
