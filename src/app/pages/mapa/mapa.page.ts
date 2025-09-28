import { Component, OnDestroy, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MapService, SalaPinDTO } from 'src/app/services/map.service';
import { environment } from 'src/environments/environment';
import { FiltrosBusqueda } from 'src/app/models/filtros.model';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.page.html',
  styleUrls: ['./mapa.page.scss'],
  standalone: false
})
export class MapaPage implements OnInit, AfterViewInit, OnDestroy {
  salas: SalaPinDTO[] = [];
  selectedId: number | null = null;
  filtros: FiltrosBusqueda = {};

  private map!: L.Map;
  private markers = new Map<number, L.Marker>();
  private moveEnd$ = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    // Lee filtros del querystring y normaliza
    this.subs.push(
      this.route.queryParams.subscribe((qp: any) => {
        const f: FiltrosBusqueda = { ...qp };

        const ensureArray = (v: any): string[] | undefined => {
          if (v === undefined || v === null || v === '') return undefined;
          if (Array.isArray(v)) return v;
          if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
          return undefined;
        };

        f.categorias = ensureArray(qp.categorias);
        f.dificultad = ensureArray(qp.dificultad);
        f.accesibilidad = ensureArray(qp.accesibilidad);
        f.restricciones_aptas = ensureArray(qp.restricciones_aptas);
        f.publico_objetivo = ensureArray(qp.publico_objetivo);
        f.tipo_sala = ensureArray(qp.tipo_sala);

        if (qp.actores !== undefined) {
          f.actores = qp.actores === true || qp.actores === 'true';
        }

        const toNum = (v: any): number | null => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        f.jugadores = toNum(qp.jugadores);
        f.precio = toNum(qp.precio);
        f.distancia_km = toNum(qp.distancia_km);

        f.lat = qp.lat !== undefined ? (typeof qp.lat === 'string' ? Number(qp.lat) : qp.lat) : null;
        f.lng = qp.lng !== undefined ? (typeof qp.lng === 'string' ? Number(qp.lng) : qp.lng) : null;

        f.ciudad = qp.ciudad ? String(qp.ciudad).trim() : undefined;
        f.idioma = qp.idioma ? String(qp.idioma).trim() : undefined;
        f.query = qp.query ? String(qp.query) : undefined;

        this.filtros = f;
      })
    );

    this.subs.push(this.moveEnd$.pipe(debounceTime(400)).subscribe(() => this.fetchByViewport()));
  }

  ngAfterViewInit(): void {
    // Asegura que el contenedor tenga altura real antes de inicializar Leaflet
    this.setMapContainerSize();
    this.initMap();

    // Recalcula tamaño tras pintado y en cambios de viewport
    setTimeout(() => this.map?.invalidateSize(), 0);
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.moveEnd$.complete();
    if (this.map) this.map.remove();
    window.removeEventListener('resize', this._onResize);
  }

  private _onResize = () => {
    this.setMapContainerSize();
    if (this.map) this.map.invalidateSize();
  };

  /** Calcula y fija la altura del #map en píxeles (viewport - header - tabs - safe areas) */
  private setMapContainerSize() {
    const mapEl = document.getElementById('map') as HTMLElement | null;
    if (!mapEl) return;

    const headerEl = document.querySelector('ion-header.page-mapa') as HTMLElement | null;
    const tabsEl = document.querySelector('ion-tab-bar[slot="bottom"]') as HTMLElement | null;

    const safeTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top')) || 0;
    const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-bottom')) || 0;

    const headerH = headerEl ? Math.round(headerEl.getBoundingClientRect().height) : 0;
    const tabsH   = tabsEl   ? Math.round(tabsEl.getBoundingClientRect().height)   : 0;

    const targetHeight = window.innerHeight - headerH - tabsH - safeTop - safeBottom;
    mapEl.style.height = `${Math.max(200, targetHeight)}px`; // mínimo defensivo
    mapEl.style.width = '100%';
  }

  private initMap() {
    if (this.map) return;

    // Iconos personalizados desde /assets/icon
    const defaultIcon = L.icon({
      iconUrl: 'assets/icon/marker-icon.png',
      iconRetinaUrl: 'assets/icon/marker-icon-2x.png',
      shadowUrl: 'assets/icon/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const lat0 = Number(this.filtros.lat) || 40.4168;
    const lng0 = Number(this.filtros.lng) || -3.7038;
    const zoom = this.filtros.ciudad ? 12 : 13;

    this.map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      maxBoundsViscosity: 1.0
    }).setView([lat0, lng0], zoom);

    const tiles = L.tileLayer(environment.tilesUrl, {
      attribution: environment.tilesAttribution,
      maxZoom: 19
    }).addTo(this.map);

    // Asegura repintado cuando los tiles terminan de cargar
    tiles.on('load', () => this.map.invalidateSize());

    this.map.on('moveend', () => this.moveEnd$.next());

    // Render de marcadores con el icono personalizado
    this.renderMarkers = () => {
      const currentIds = new Set(this.salas.map(s => s.id_sala));

      for (const [id, marker] of this.markers.entries()) {
        if (!currentIds.has(id)) {
          marker.removeFrom(this.map);
          this.markers.delete(id);
        }
      }

      for (const s of this.salas) {
        if (!s.latitud || !s.longitud) continue;
        let m = this.markers.get(s.id_sala);
        if (!m) {
          m = L.marker([s.latitud, s.longitud], { icon: defaultIcon }).addTo(this.map);
          m.bindPopup(`<b>${s.nombre}</b>${s.distancia_km ? `<br>📍 ${s.distancia_km.toFixed(1)} km` : ''}`);
          m.on('click', () => this.onMarkerClick(s.id_sala));
          this.markers.set(s.id_sala, m);
        } else {
          m.setLatLng([s.latitud, s.longitud]);
        }
        m.setZIndexOffset(this.selectedId === s.id_sala ? 1000 : 0);
      }
      this.updateMapBounds();
    };

    // Primera carga de datos
    if (this.filtros.ciudad) {
      this.fetch({ ...this.filtros });
    } else if (this.filtros.lat != null && this.filtros.lng != null) {
      const base: FiltrosBusqueda = { ...this.filtros };
      if (!base.distancia_km && !base.bbox && !base.radio_km) {
        base.radio_km = 7;
      }
      this.fetch(base);
    } else {
      this.fetchByViewport();
    }
  }

  private getBBoxQuery() {
    const b = this.map.getBounds();
    const w = b.getWest();
    const s = b.getSouth();
    const e = b.getEast();
    const n = b.getNorth();
    return `${w.toFixed(6)},${s.toFixed(6)},${e.toFixed(6)},${n.toFixed(6)}`;
  }

  private fetchByViewport() {
    const bbox = this.getBBoxQuery();
    const center = this.map.getCenter();
    const lat = Number(center.lat.toFixed(6));
    const lng = Number(center.lng.toFixed(6));
    const params: FiltrosBusqueda = { ...this.filtros, lat, lng, bbox };
    this.fetch(params);
  }

  private fetch(params: FiltrosBusqueda) {
    this.mapService.getSalasMap(params).subscribe({
      next: (rows) => {
        this.zone.run(() => {
          this.salas = rows || [];
          this.renderMarkers();
          
        });
      },
      error: (err) => {
        console.error('Error cargando salas del mapa', err);
      }
    });
  }

  // Se sobrescribe en initMap para usar defaultIcon
  private renderMarkers() {
    const currentIds = new Set(this.salas.map(s => s.id_sala));
    for (const [id, marker] of this.markers.entries()) {
      if (!currentIds.has(id)) {
        marker.removeFrom(this.map);
        this.markers.delete(id);
      }
    }
    for (const s of this.salas) {
      if (!s.latitud || !s.longitud) continue;
      let m = this.markers.get(s.id_sala);
      if (!m) {
        m = L.marker([s.latitud, s.longitud]).addTo(this.map);
        m.on('click', () => this.onMarkerClick(s.id_sala));
        this.markers.set(s.id_sala, m);
      } else {
        m.setLatLng([s.latitud, s.longitud]);
      }
      m.setZIndexOffset(this.selectedId === s.id_sala ? 1000 : 0);
    }
    this.updateMapBounds();
  }

  private updateMapBounds() {
    if (!this.map) return;

    const coords = this.salas
      .filter(s => typeof s.latitud === 'number' && typeof s.longitud === 'number')
      .map(s => L.latLng(s.latitud!, s.longitud!));

    if (!coords.length) {
      this.map.setMaxBounds(null as unknown as L.LatLngBoundsExpression);
      return;
    }

    const bounds = L.latLngBounds(coords).pad(0.2);
    this.map.setMaxBounds(bounds);

    if (!bounds.contains(this.map.getCenter())) {
      this.map.panInsideBounds(bounds, { animate: false });
    }
  }

  onMarkerClick(id: number) {
    this.selectedId = id;
    const el = document.querySelector(`[data-sala-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    this.renderMarkers();
  }

  onCardFocus(id: number) {
    this.selectedId = id;
    const s = this.salas.find(x => x.id_sala === id);
    if (s?.latitud && s?.longitud) {
      this.map.panTo([s.latitud, s.longitud], { animate: true });
    }
    this.renderMarkers();
  }
}
