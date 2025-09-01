// ==============================
// 🧭 DireccionPickerComponent.ts
// ==============================

import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UbicacionService, UbicacionResultado } from 'src/app/services/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { ClearUbicacionUsuario, SetUbicacionUsuario, UsuarioState } from 'src/app/states/usuario.state';

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

  private queryChanged = new Subject<string>();
  private querySub?: Subscription;

  constructor(private ubicacionService: UbicacionService, private store: Store) {}

  ngOnInit() {
    const ubicacion = this.store.selectSnapshot(UsuarioState.ubicacion);
    if (ubicacion?.ciudad) {
      this.ciudadActual = ubicacion.ciudad;
    }

    if (ubicacion?.direccion) {
      // Si hay dirección guardada, pinta solo el primer tramo o "(Centro)" si coincide con la ciudad
      this.direccionActual = ubicacion.direccion;
      const seg = this.firstSegment(this.direccionActual);
      this.calleNumero = this.segEsCiudad(seg, this.ciudadActual) ? '(Centro)' : (seg || '(Centro)');
    } else if (this.ciudadActual) {
      // Caso: solo ciudad (no se introdujo dirección)
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
        // Autocomplete: mostrar EXACTAMENTE lo que manda el backend
        this.ubicacionService.autocomplete(texto.trim()).subscribe((res) => {
          this.predicciones = res || [];
        });
      });
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
  }

  togglePanel() {
    this.abierto = !this.abierto;
    if (this.abierto) {
      // Al abrir, limpiar el input para no mostrar la última dirección
      this.query = '';
      this.predicciones = [];
    } else {
      // Al cerrar, limpiar predicciones
      this.predicciones = [];
    }
  }

  onModalDismiss() {
    this.abierto = false;
  // Al cerrar por dismiss, también limpiar el input
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

        this.updateCalleNumeroBackendAware(res);

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

          this.updateCalleNumeroBackendAware(res);

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
  // En la plantilla usa {{ prediccion }} o [innerText], no innerHTML.
  highlight(texto: string): string {
    return texto; // exacto del backend
  }

  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // =========================
  // 🔽 Formateo del “chip” (vía + número) con fallback "(Centro)"
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

  private isEmptyVia(res: UbicacionResultado): boolean {
    const v = (res.via ?? '').trim();
  
    return !v;
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

  private abreviarViaTipo(tipo?: string | null): string {
    if (!tipo) return '';
    return this.abreviarToken(tipo);
  }

  private abreviarDesdeVia(via: string): string | null {
    const re = /^\s*(c\/|c\.|calle|avenida|avda\.?|av\.?|paseo|pº|ps\.?|plaza|pl\.?|camino|carretera|ctra\.?|ronda|v[íi]a|traves[íi]a|trav\.?|bulevar|boulevard|blvr|carrer|passeig|pg|pasaje|pje\.?|glorieta|gta\.?)\s+(.+)$/i;
    const m = via.match(re);
    if (!m) return null;
    const token = m[1];
    const nombre = m[2].trim();
    const abbr = this.abreviarToken(token);
    return `${abbr} ${nombre}`.trim();
  }

  private fromBackendCalleNumero(res: UbicacionResultado): string | null {
    const via = (res.via ?? '').trim();
    const viaTipo = (res.via_tipo ?? '').trim();
    const viaNombre = (res.via_nombre ?? '').trim();
    const numero = (res.numero ?? '').trim();

    let principal = '';
    if (viaTipo && viaNombre) {
      principal = `${this.abreviarViaTipo(viaTipo)} ${viaNombre}`.trim();
    } else if (via) {
      principal = this.abreviarDesdeVia(via) || via;
    } else if (viaNombre) {
      principal = viaNombre;
    }
    if (!principal) return null;

    const yaTieneNumero = /\b\d/.test(principal);
    return (!yaTieneNumero && numero) ? `${principal} ${numero}`.trim() : principal;
  }

  private firstSegment(addr?: string | null): string | null {
    if (!addr) return null;
    const seg = addr.split(',')[0]?.trim() || '';
    return seg || null;
  }

  private baseFromFormattedOrCentro(res: UbicacionResultado): string | null {
    const base = this.firstSegment(res.direccion);
    if (!base) return '(Centro)';
    if (this.segEsCiudad(base, res.ciudad)) return '(Centro)';
    const numero = (res.numero ?? '').trim();
    const yaTieneNumero = /\b\d/.test(base);
    return (!yaTieneNumero && numero) ? `${base} ${numero}`.trim() : base;
  }

  // Siempre prioriza campos desglosados; si no hay vía -> "(Centro)"
  private updateCalleNumeroBackendAware(res?: UbicacionResultado) {
    if (res) {
      if (this.isEmptyVia(res)) {
        this.calleNumero = '(Centro)';
      } else {
        this.calleNumero = this.fromBackendCalleNumero(res) || this.baseFromFormattedOrCentro(res) || '(Centro)';
      }
    } else {
      // Sin respuesta reciente: decide con lo que hay en estado
      const seg = this.firstSegment(this.direccionActual);
      this.calleNumero = this.segEsCiudad(seg, this.ciudadActual) ? '(Centro)' : (seg || (this.ciudadActual ? '(Centro)' : null));
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
