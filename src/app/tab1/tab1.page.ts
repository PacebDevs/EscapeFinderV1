// tab1.page.ts
import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { Store } from '@ngxs/store';
import { ModalController, IonContent } from '@ionic/angular';
import { GetSalas, AppendSalas, SalaState, UpdateSala } from '../states/salas/salas.state';
import { SocketService } from '../services/socket.service';
import { FiltersModalComponent } from '../components/filter-modal/filters-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CATEGORIAS } from '../constants/categorias.const';
import { Subscription } from 'rxjs';
import { IonInfiniteScroll } from '@ionic/angular';
import { UsuarioState } from '../states/usuario.state';
import { Router } from '@angular/router'; // <-- añade

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false
})
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  categorias = CATEGORIAS;
  salas$ = this.store.select(SalaState.salas);
  filters: any = {};
  categoriasActivas: string[] = [];
  numeroSalas = 0;
  private subs: Subscription[] = [];

  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  @ViewChild(IonContent) pageContent!: IonContent;

  // Header movible (sticky) dentro del ion-content
  @ViewChild('collapsible', { static: false }) collapsibleRef!: ElementRef<HTMLDivElement>;



  
  private latUsuario: number | null = null;
  private lngUsuario: number | null = null;

  limit = 20;
  offset = 0;
  todasCargadas = false;
  cargando = false;
  observer!: IntersectionObserver;

  // Estado del colapso/movimiento
  private maxCollapse = 0;     // altura natural del bloque colapsable
  private headerOffset = 0;    // desplazamiento consumido (0..maxCollapse)
  private lastY = 0;           // último scrollTop para Δ
  private ticking = false;
  private ro?: ResizeObserver;
  private scrollEl!: HTMLElement;
    


    constructor(
    private store: Store,
    private socketService: SocketService,
    private modalCtrl: ModalController,
    private router: Router // <-- añade
  ) {}

  ngOnInit() {
    this.subs.push(this.salas$.subscribe(salas => (this.numeroSalas = salas.length)));

    this.subs.push(
      this.store.select(UsuarioState.ubicacion).subscribe(ubicacion => {
        const { ciudad, lat, lng } = ubicacion || {};
        this.latUsuario = lat ?? null;
        this.lngUsuario = lng ?? null;
        if (ciudad) {
          this.filters = { ...this.filters, ciudad };
        } else {
          const { ciudad: _c, ...rest } = this.filters;
          this.filters = { ...rest };
        }
      })
    );

    this.socketService.connect();
    this.subs.push(this.socketService.listenSalasUpdated().subscribe(() => this.reloadSalas()));
    this.subs.push(
      this.socketService.listenSalaModificada().subscribe(sala => {
        if (this.aplicaFiltros(sala)) this.store.dispatch(new UpdateSala(sala));
      })
    );

     // ⚠️ Solo cargar si no hay data en el store (evita flicker al volver)
  const existing = this.store.selectSnapshot(SalaState.salas);
  if (!existing || existing.length === 0) {
    this.reloadSalas();
  }
  }

  async ngAfterViewInit() {
    // (opcional) infinito manual
    this.observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry.isIntersecting && !this.cargando && !this.todasCargadas) this.loadMore();
    });

    await this.waitForToolbarReady();
    this.scrollEl = await this.pageContent.getScrollElement();
    this.measureAndFixHeaderHeight(); // fija maxCollapse y deja el contenedor sticky con altura FIJA

    // Estado inicial del movimiento
    this.headerOffset = 0;
    this.lastY = 0;
    this.setHeaderOffsetVar(0); // inner sin desplazar

    // Observa cambios de tamaño dinámicos (chips, etc.) y mantiene la proporción visible
    const el = this.collapsibleRef?.nativeElement;
    if (el && 'ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => {
        const visibleAntes = Math.max(0, this.maxCollapse - this.headerOffset);
        this.measureAndFixHeaderHeight(); // recalcula maxCollapse y actualiza altura fija del contenedor
        const visibleDespues = Math.max(0, Math.min(visibleAntes, this.maxCollapse));
        this.headerOffset = Math.max(0, this.maxCollapse - visibleDespues);
        this.setHeaderOffsetVar(Math.round(this.headerOffset));
      });
      this.ro.observe(el);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.socketService.disconnect();
    if (this.ro) { try { this.ro.disconnect(); } catch {} this.ro = undefined; }
  }

  // ======== Scroll 1:1 — header acompaña al scroll sin umbrales ========
  onScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    if (!this.maxCollapse) return;

    const dy = y - this.lastY;
    this.lastY = y;

    // Ocultar/mostrar a la misma velocidad del scroll, limitado al rango [0, maxCollapse]
    this.headerOffset = Math.max(0, Math.min(this.maxCollapse, this.headerOffset + dy));

    if (!this.ticking) {
      this.ticking = true;
      requestAnimationFrame(() => {
        const offset = Math.round(this.headerOffset);
        this.setHeaderOffsetVar(offset);
        this.ticking = false;
      });
    }
  }



  // ========== Utilidades de medición / estilo ==========
  private async waitForToolbarReady() {
    if ('customElements' in window && (customElements as any).whenDefined) {
      try { await (customElements as any).whenDefined('ion-toolbar'); } catch {}
    }
    const toolbar = this.collapsibleRef?.nativeElement?.querySelector('ion-toolbar') as any;
    if (toolbar?.componentOnReady) { try { await toolbar.componentOnReady(); } catch {} }
    await new Promise<void>(r => requestAnimationFrame(() => r()));
  }

private measureAndFixHeaderHeight() {
  const el = this.collapsibleRef?.nativeElement;
  if (!el) return;

  el.style.height = 'auto';
  let h = el.scrollHeight || el.getBoundingClientRect().height || 0;
  if (h < 1) h = 120;
  this.maxCollapse = Math.ceil(h);

  // altura FIJA del contenedor sticky
  el.style.height = `${this.maxCollapse}px`;
  // Clampear offset si la altura cambió
  this.headerOffset = Math.max(0, Math.min(this.headerOffset, this.maxCollapse));
}

  private setHeaderOffsetVar(px: number) {
    const el = this.collapsibleRef?.nativeElement;
    if (!el) return;
  el.style.setProperty('--header-offset', `${px}px`);
  }

  // ========= Lógica existente =========
  async selectCategoria(valor: string) {
    if (valor === 'Filtros') { await this.openFilters(); return; }
    const index = this.categoriasActivas.indexOf(valor);
    if (index > -1) this.categoriasActivas.splice(index, 1);
    else this.categoriasActivas.push(valor);

    this.filters = this.categoriasActivas.length === 0
      ? { ...this.filters, categorias: undefined }
      : { ...this.filters, categorias: [...this.categoriasActivas] };

    await Haptics.impact({ style: ImpactStyle.Light });
    this.reloadSalas();
  }

  async openFilters() {
    const modal = await this.modalCtrl.create({
      component: FiltersModalComponent,
      componentProps: { filtrosActuales: this.filters },
      showBackdrop: true,
      cssClass: 'filters-modal-sheet',
      breakpoints: [0, 0.5, 1],
      initialBreakpoint: 1
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      this.filters = { ...this.filters, ...data };
      this.categoriasActivas = this.filters.categorias ? [...this.filters.categorias] : [];
      this.reloadSalas();
    }
  }

  onCiudadSeleccionada(ciudad: string | null) {
    if (ciudad) {
      this.filters = { ...this.filters, ciudad };
    } else {
      const { ciudad: _c, distancia_km: _d, coordenadas: _coords, ...rest } = this.filters;
      this.filters = { ...rest };
    }
    this.reloadSalas();
  }

  aplicaFiltros(sala: any): boolean {
    const q = this.filters.query?.toLowerCase() || '';
    const nombre = sala.nombre?.toLowerCase() || '';
    const empresa = sala.empresa?.toLowerCase() || '';
    if (q && !nombre.includes(q) && !empresa.includes(q)) return false;
    if (this.filters.categorias?.length > 0) {
      const categorias = sala.categorias || [];
      const intersecta = categorias.some(c => this.filters.categorias.includes(c));
      if (!intersecta) return false;
    }
    return true;
  }

  private getFiltros(offset: number): any {
    const filtros = { ...this.filters, offset, limit: this.limit };
    if (!filtros.distancia_km) {
      delete filtros.lat; delete filtros.lng;
    } else {
      filtros.lat = this.latUsuario;
      filtros.lng = this.lngUsuario;
    }
    return filtros;
  }

  reloadSalas() {
    this.pageContent?.scrollToTop(0);

    // Reset visual del header (totalmente visible)
    this.headerOffset = 0;
    this.lastY = 0;
    this.setHeaderOffsetVar(0);

    this.offset = 0;
    this.todasCargadas = false;
    this.cargando = true;

    const filtros = this.getFiltros(0);
    this.store.dispatch(new GetSalas(filtros)).subscribe({
      next: () => { this.offset = this.limit; this.cargando = false; },
      error: (err) => { this.cargando = false; console.error('Error al cargar salas', err); }
    });
  }

  loadMore(event?: any) {
    if (this.cargando || this.todasCargadas) { event?.target?.complete(); return; }
    this.cargando = true;

    const filtros = this.getFiltros(this.offset);
    this.store.dispatch(new AppendSalas(filtros)).subscribe((res: any) => {
      const recibidas = res.sala?.cantidad || 0;
      this.offset += recibidas;
      if (recibidas === 0 || recibidas < this.limit) this.todasCargadas = true;
      event?.target?.complete();
      this.cargando = false;
    });
  }

  trackBySalaId(_i: number, sala: any): any { return sala.id_sala; }
  onMapaClick() { console.log('🗺️ Click en botón de mapa (a implementar)'); }
  onNotificacionesClick() { console.log('🔔 Notificaciones clickeadas'); }

  get filtrosActivos(): number {
    const { ciudad, query, ...rest } = this.filters;
    let total = 0;
    Object.values(rest).forEach(value => {
      if (Array.isArray(value)) total += value.length;
      else if (value !== undefined && value !== null && value !== '' && value !== false) total += 1;
    });
    return total;
  }

abrirSalaDetalle(id: number) {
  // Navegación “forward” → Tab1 queda en la pila y conserva scroll/filtros
  this.router.navigate(['/sala', id]);
}
}


