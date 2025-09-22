// src/app/pages/mapa/mapa.page.ts
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

        // Arrays: si ya son array, respeta; si vienen como string CSV, parte
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

        // Booleans que podrían venir como string
        if (qp.actores !== undefined) {
          f.actores = qp.actores === true || qp.actores === 'true';
        }

        // Numéricos
        const toNum = (v: any): number | null => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        f.jugadores = toNum(qp.jugadores);
        f.precio = toNum(qp.precio);
        f.distancia_km = toNum(qp.distancia_km);

        // Coords pueden venir como number/string/null
        f.lat = qp.lat !== undefined ? (typeof qp.lat === 'string' ? Number(qp.lat) : qp.lat) : null;
        f.lng = qp.lng !== undefined ? (typeof qp.lng === 'string' ? Number(qp.lng) : qp.lng) : null;

        // Mantén ciudad/idioma/query tal cual (string o undefined)
        f.ciudad = qp.ciudad ? String(qp.ciudad).trim() : undefined;
        f.idioma = qp.idioma ? String(qp.idioma).trim() : undefined;
        f.query = qp.query ? String(qp.query) : undefined;

        this.filtros = f;
      })
    );

    this.subs.push(this.moveEnd$.pipe(debounceTime(400)).subscribe(() => this.fetchByViewport()));
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.moveEnd$.complete();
    if (this.map) this.map.remove();
  }

  private initMap() {
    if (this.map) return;

    (L.Icon.Default as any).mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    const lat0 = Number(this.filtros.lat) || 40.4168;
    const lng0 = Number(this.filtros.lng) || -3.7038;
    const zoom = this.filtros.ciudad ? 12 : 13;

    this.map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([lat0, lng0], zoom);

    L.tileLayer(environment.tilesUrl, {
      attribution: environment.tilesAttribution,
      maxZoom: 19
    }).addTo(this.map);

    this.map.on('moveend', () => this.moveEnd$.next());

    // Primera carga:
    if (this.filtros.ciudad) {
      this.fetch({ ...this.filtros });
    } else if (this.filtros.lat != null && this.filtros.lng != null) {
      // Si Tab1 nos pasa distancia_km la reutilizamos (misma semántica)
      const base: FiltrosBusqueda = { ...this.filtros };
      if (!base.distancia_km && !base.bbox && !base.radio_km) {
        base.radio_km = 7; // fallback suave solo si no hay distancia ni bbox
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

    // Respetamos distancia_km si ya viene de Tab1; si no, usamos bbox
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
