import { Component, OnDestroy, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MapService, SalaPinDTO } from 'src/app/services/map.service';
import { environment } from 'src/environments/environment';
import { FiltrosBusqueda } from 'src/app/models/filtros.model';
import { Store } from '@ngxs/store';
import { UsuarioState } from 'src/app/states/usuario.state';

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
  private gruposPorCoord = new Map<string, SalaPinDTO[]>();
  private markersPorGrupo = new Map<string, L.Marker>();
  private moveEnd$ = new Subject<void>();
  private subs: Subscription[] = [];
  private hasFetchedOnce = false;
  private markerIcon!: L.Icon;
  private selectedMarkerIcon!: L.Icon;
  private userMarkerIcon!: L.Icon;
  private userMarker?: L.Marker;
  private userLocation?: { lat: number; lng: number };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapService,
    private zone: NgZone,
    private store: Store
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
     this.subs.push(
      this.store.select(UsuarioState.ubicacion).subscribe(ubicacion => {
        const lat = ubicacion?.lat;
        const lng = ubicacion?.lng;
        if (Number.isFinite(lat ?? NaN) && Number.isFinite(lng ?? NaN)) {
          this.userLocation = { lat: lat as number, lng: lng as number };
        } else {
          this.userLocation = undefined;
        }
        this.renderUserMarker();
      })
    );
  }

  ngAfterViewInit(): void {
    this.setMapContainerSize();
    this.initMap();
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
      if (this.map) {
      this.map.invalidateSize();
      this.createMarkerIcons();
      this.renderMarkers();
      this.renderUserMarker();
    }
  };

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
    mapEl.style.height = `${Math.max(200, targetHeight)}px`;
    mapEl.style.width = '100%';
  }

  private initMap() {
    if (this.map) return;
  this.createMarkerIcons();


    const lat0 = Number(this.filtros.lat) || 40.4168;
    const lng0 = Number(this.filtros.lng) || -3.7038;
    const zoom = this.filtros.ciudad ? 12 : 13;

    this.map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      maxBoundsViscosity: 1.0
    }).setView([lat0, lng0], zoom);

    const tiles = L.tileLayer(environment.tilesUrl, {
      attribution: environment.tilesAttribution,
      maxZoom: 19
    }).addTo(this.map);

    tiles.on('load', () => this.map.invalidateSize());

    this.map.on('moveend', () => this.moveEnd$.next());

     this.renderUserMarker();

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
  private createMarkerIcons() {
    const width = window.innerWidth || 0;
    const isTabletOrDesktop = width >= 768;

    const iconSize = isTabletOrDesktop ? [54, 74] : [34, 50];
    const selectedIconSize = isTabletOrDesktop ? [66, 90] : [44, 64];
    console.log("tamaño iconos", iconSize, selectedIconSize);
    const iconAnchor: L.PointTuple = [Math.round(iconSize[0] / 2), iconSize[1]];
    const selectedIconAnchor: L.PointTuple = [Math.round(selectedIconSize[0] / 2), selectedIconSize[1]];

    const shadowScale = isTabletOrDesktop ? 1.2 : 1.0;
    const baseShadow = Math.round(40 * shadowScale);
    const baseShadowSize: L.PointTuple = [baseShadow, baseShadow];
    const selectedShadow = Math.round(baseShadow * 1.15);

    this.markerIcon = L.icon({
      iconUrl: 'assets/icon/marker-escape-purple.svg',
      iconRetinaUrl: 'assets/icon/marker-escape-purple.svg',
      shadowUrl: 'assets/icon/marker-shadow.png',
      iconSize,
      iconAnchor,
      popupAnchor: [1, -Math.round(iconSize[1] * 0.65)],
      shadowSize: baseShadowSize
    });

    this.selectedMarkerIcon = L.icon({
      iconUrl: 'assets/icon/marker-escape-purple-selected.svg',
      iconRetinaUrl: 'assets/icon/marker-escape-purple-selected.svg',
      shadowUrl: 'assets/icon/marker-shadow.png',
      iconSize: selectedIconSize,
      iconAnchor: selectedIconAnchor,
      popupAnchor: [1, -Math.round(selectedIconSize[1] * 0.74)],
      shadowSize: [selectedShadow, selectedShadow]
    });
    this.userMarkerIcon = L.icon({
      iconUrl: 'assets/icon/marker-user-escape-teal.svg',
      iconRetinaUrl: 'assets/icon/marker-user-escape-teal.svg',
      shadowUrl: 'assets/icon/marker-shadow.png',
      iconSize,
      iconAnchor,
      popupAnchor: [1, -Math.round(iconSize[1] * 0.65)],
      shadowSize: baseShadowSize
    });

    if (this.userMarker) {
      this.userMarker.setIcon(this.userMarkerIcon);
    }
  }

  private renderUserMarker() {
    if (!this.map || !this.userMarkerIcon) return;

    const lat = this.userLocation?.lat;
    const lng = this.userLocation?.lng;

    if (!Number.isFinite(lat ?? NaN) || !Number.isFinite(lng ?? NaN)) {
      if (this.userMarker) {
        this.userMarker.removeFrom(this.map);
        this.userMarker = undefined;
      }
      return;
    }

    const position = L.latLng(lat as number, lng as number);

    if (!this.userMarker) {
      this.userMarker = L.marker(position, {
        icon: this.userMarkerIcon,
        zIndexOffset: 2000
      }).addTo(this.map);
    } else {
      this.userMarker.setLatLng(position);
      this.userMarker.setIcon(this.userMarkerIcon);
      this.userMarker.setZIndexOffset(2000);
      if (!this.map.hasLayer(this.userMarker)) {
        this.userMarker.addTo(this.map);
      }
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
    if (this.hasFetchedOnce) {
      return;
    }
    this.hasFetchedOnce = true;
    this.mapService.getSalasMap(params).subscribe({
      next: (rows) => {
        this.zone.run(() => {
          this.salas = rows || [];
          this.rebuildGruposPorCoord();
          this.renderMarkers();
        });
      },
      error: (err) => {
        console.error('Error cargando salas del mapa', err);
      }
    });
  }

  private renderMarkers() {
    if (!this.map || !this.markerIcon) return;

    const keysActuales = new Set(this.gruposPorCoord.keys());
    for (const [key, marker] of this.markersPorGrupo.entries()) {
      if (!keysActuales.has(key)) {
        marker.removeFrom(this.map);
        this.markersPorGrupo.delete(key);
      }
    }

    for (const [key, salasDelGrupo] of this.gruposPorCoord.entries()) {
      if (!salasDelGrupo.length) continue;
      const [latStr, lngStr] = key.split(',');
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      let marker = this.markersPorGrupo.get(key);
      const count = salasDelGrupo.length;
      const posicion = L.latLng(lat, lng);

      const isSelected = this.selectedId != null && salasDelGrupo.some(s => s.id_sala === this.selectedId);

      if (!marker) {
        marker = L.marker(posicion, { icon: isSelected ? this.selectedMarkerIcon : this.markerIcon }).addTo(this.map);
        this.markersPorGrupo.set(key, marker);
      } else {
        marker.setLatLng(posicion);
        marker.setIcon(isSelected ? this.selectedMarkerIcon : this.markerIcon);
      }

      const markerRef = marker;
      if (!markerRef) continue;

      markerRef.off('click');
      markerRef.off('popupopen');
      markerRef.off('popupclose');
      markerRef.unbindPopup();

      markerRef.setZIndexOffset(isSelected ? 1000 : 0);

      if (count === 1) {
        markerRef.on('click', () => this.onMarkerClick(salasDelGrupo[0].id_sala));
      } else {
        const salasOrdenadas = [...salasDelGrupo].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        const popupHtml = this.buildPopupContent(salasOrdenadas);
        markerRef.bindPopup(popupHtml, { closeButton: true, maxWidth: 260 });

        markerRef.on('popupopen', (event: L.PopupEvent) => {
          const popupEl = event.popup.getElement();
          if (!popupEl) return;
          const listEl = popupEl.querySelector('.ef-popup__list');
          if (!listEl) return;

          const handleClick = (ev: Event) => {
            const target = ev.target as HTMLElement | null;
            const item = target?.closest('li[data-id-sala]') as HTMLElement | null;
            if (!item) return;
            const idSala = Number(item.dataset["idSala"]);
            if (!Number.isFinite(idSala)) return;
            markerRef.closePopup();
            this.onMarkerClick(idSala);
          };

          listEl.addEventListener('click', handleClick);

          markerRef.once('popupclose', () => {
            listEl.removeEventListener('click', handleClick);
          });
        });
      }
    }

    this.updateMapBounds();
    
    // Centrar la primera card al cargar inicialmente
    if (this.salas.length > 0 && !this.selectedId) {
      setTimeout(() => this.centerFirstCard(), 100);
    }
  }

  private rebuildGruposPorCoord() {
    this.gruposPorCoord.clear();
    for (const sala of this.salas) {
      if (typeof sala.latitud !== 'number' || typeof sala.longitud !== 'number') continue;
      const key = this.coordKey(sala.latitud, sala.longitud);
      const grupo = this.gruposPorCoord.get(key);
      if (grupo) {
        grupo.push(sala);
      } else {
        this.gruposPorCoord.set(key, [sala]);
      }
    }
  }

  private coordKey(lat: number, lng: number): string {
    const latRounded = lat.toFixed(6);
    const lngRounded = lng.toFixed(6);
    return `${latRounded},${lngRounded}`;
  }

  private buildPopupContent(salas: SalaPinDTO[]): string {
    const ciudades = new Set(
      salas
        .map(s => (s.ciudad ? s.ciudad.trim() : ''))
        .filter(Boolean)
    );

    const tieneCiudadUnica = ciudades.size === 1;
    const ciudad = tieneCiudadUnica ? Array.from(ciudades)[0] : null;
    const titulo = ciudad ? `Salas en esta ubicación – ${ciudad}` : 'Salas en esta ubicación';

    const items = salas
      .map(s => {
        const distancia = typeof s.distancia_km === 'number' ? `${s.distancia_km.toFixed(1)} km` : '';
        return `
          <li data-id-sala="${s.id_sala}">
            <span class="ef-popup__name">${s.nombre}</span>
            ${distancia ? `<span class="ef-popup__distance">${distancia}</span>` : ''}
          </li>
        `;
      })
      .join('');

    return `
      <div class="ef-popup">
        <div class="ef-popup__title">${titulo}</div>
        <ul class="ef-popup__list">${items}</ul>
      </div>
    `;
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

    const bounds = L.latLngBounds(coords);
    const paddedBounds = bounds.pad(1.0);
    this.map.setMaxBounds(paddedBounds);

    if (!paddedBounds.contains(this.map.getCenter())) {
      this.map.panInsideBounds(paddedBounds, { animate: false });
    }
  }

  onMarkerClick(id: number) {
    this.selectedId = id;
    this.centerCardInCarousel(id);
    this.renderMarkers();
  }

  onCardFocus(id: number) {
    this.selectedId = id;
    this.centerCardInCarousel(id);
    const s = this.salas.find(x => x.id_sala === id);
    if (s?.latitud && s?.longitud) {
      this.map.panTo([s.latitud, s.longitud], { animate: true });
    }
    this.renderMarkers();
  }

  irASala(id: number, event?: Event) {
    event?.stopPropagation();
    if (id == null) {
      return;
    }
    if (this.selectedId !== id) {
      this.selectedId = id;
    }
    this.router.navigate(['/sala', id]);
  }


  private centerFirstCard() {
    const track = document.querySelector<HTMLElement>('.carousel-track');
    if (!track) return;
    track.scrollTo({ left: 0, behavior: 'auto' });
  }

  private centerCardInCarousel(id: number, behavior: ScrollBehavior = 'smooth') {
    // Esperar a que Angular renderice la card
    setTimeout(() => {
      requestAnimationFrame(() => {
        const track = document.querySelector<HTMLElement>('.carousel-track');
        const slide = document.querySelector<HTMLElement>(`.carousel-slide[data-sala-id="${id}"]`);
        
        if (!track || !slide) {
          console.warn(`No se encontró la card para la sala ${id}`);
          return;
        }

        const slideRect = slide.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const currentScroll = track.scrollLeft;
        const desiredScroll =
          currentScroll + (slideRect.left - trackRect.left) - (trackRect.width - slideRect.width) / 2;
        const maxScroll = track.scrollWidth - track.clientWidth;
        const normalizedScroll = Math.max(0, Math.min(desiredScroll, maxScroll));

        track.scrollTo({ left: normalizedScroll, behavior });
      });
    }, 50);
  }
}
