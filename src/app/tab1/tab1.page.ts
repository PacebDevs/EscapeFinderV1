import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngxs/store';
import { ModalController, IonContent } from '@ionic/angular';
import { GetSalas, AppendSalas, SalaState, UpdateSala } from '../states/salas/salas.state';
import { SocketService } from '../services/socket.service';
import { FiltersModalComponent } from '../components/filter-modal/filters-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CATEGORIAS } from '../constants/categorias.const';
import { Subscription } from 'rxjs';
import { UsuarioState } from '../states/usuario.state';
import { filter } from 'rxjs/operators';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  categorias = CATEGORIAS;
  salas$ = this.store.select(SalaState.salas);
  filters: any = {};
  categoriasActivas: string[] = [];
  numeroSalas = 0;

  private subs: Subscription[] = [];
  private navSub?: Subscription;

  @ViewChild(IonContent) pageContent!: IonContent;
  @ViewChild('collapsible', { static: false }) collapsibleRef!: ElementRef<HTMLDivElement>;

  private latUsuario: number | null = null;
  private lngUsuario: number | null = null;

  limit = 20;
  offset = 0;
  todasCargadas = false;
  cargando = false;

  // Header (modo Δ)
  private maxCollapse = 0;
  private headerOffset = 0;
  private lastScrollTop = 0;
  private raf = false;
  private ro?: ResizeObserver;
  private scrollEl!: HTMLElement;

  // Estado guardado al salir
  private savedScrollTop = 0;
  private savedHeaderOffset = 0;
  private ignoreNextDelta = false;
  modalController: any;

  constructor(
    private store: Store,
    private socketService: SocketService,
    private modalCtrl: ModalController,
    private router: Router,
    private cdr: ChangeDetectorRef // 👈 Agregado para updates manuales
  ) {}

  ngOnInit() {
    // ✅ Los observables funcionan bien con OnPush
    this.subs.push(
      this.salas$.subscribe(salas => {
        this.numeroSalas = salas.length;
        this.cdr.markForCheck(); // 👈 Marca para check manual
      })
    );

    this.subs.push(
      this.store.select(UsuarioState.ubicacion).subscribe(ubicacion => {
        const { ciudad, lat, lng } = ubicacion || {};
        this.latUsuario = lat ?? null;
        this.lngUsuario = lng ?? null;
        
        if (ciudad) {
          // ✅ Crear nuevo objeto en lugar de mutar
          this.filters = { ...this.filters, ciudad };
        } else {
          const { ciudad: _c, ...rest } = this.filters;
          this.filters = { ...rest };
        }
        this.cdr.markForCheck(); // 👈 Marca para check manual
      })
    );

    this.socketService.connect();
    
    this.subs.push(
      this.socketService.listenSalasUpdated().subscribe(() => {
        this.reloadSalas();
        this.cdr.markForCheck(); // 👈 Marca para check manual
      })
    );

    this.subs.push(
      this.socketService.listenSalaModificada().subscribe(sala => {
        if (this.aplicaFiltros(sala)) {
          this.store.dispatch(new UpdateSala(sala));
          this.cdr.markForCheck(); // 👈 Marca para check manual
        }
      })
    );

    const existing = this.store.selectSnapshot(SalaState.salas);
    if (!existing || existing.length === 0) this.reloadSalas();

    // Navigation handling
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationStart || e instanceof NavigationEnd))
      .subscribe(async e => {
        if (e instanceof NavigationStart) {
          if (this.router.url.startsWith('/tabs/tab1')) {
            await this.ensureScrollEl();
            this.savedScrollTop = this.scrollEl?.scrollTop || 0;
            this.savedHeaderOffset = this.headerOffset;
          }
        } else {
          const url = (e as NavigationEnd).urlAfterRedirects || '';
          if (url.startsWith('/tabs/tab1')) {
            await this.ensureScrollEl();
            this.measureAndFixHeaderHeight();

            const y = Math.max(0, this.savedScrollTop);
            requestAnimationFrame(() => {
              this.scrollEl.scrollTop = y;
              requestAnimationFrame(() => {
                this.scrollEl.scrollTop = y;
                this.lastScrollTop = y;
                this.headerOffset = this.clamp(this.savedHeaderOffset);
                this.setHeaderOffsetVar(this.headerOffset);
                this.ignoreNextDelta = true;
                this.cdr.markForCheck(); // 👈 Marca para check manual
              });
            });
          }
        }
      });
  }

  async ngAfterViewInit() {
    await this.waitForToolbarReady();
    this.scrollEl = await this.pageContent.getScrollElement();

    this.measureAndFixHeaderHeight();

    const y = this.scrollEl.scrollTop || 0;
    this.lastScrollTop = y;
    this.headerOffset = this.clamp(this.headerOffset);
    this.setHeaderOffsetVar(this.headerOffset);

    const el = this.collapsibleRef?.nativeElement;
    if (el && 'ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => {
        const visibleAntes = Math.max(0, this.maxCollapse - this.headerOffset);
        this.measureAndFixHeaderHeight();
        const visibleDespues = Math.max(0, Math.min(visibleAntes, this.maxCollapse));
        this.headerOffset = this.clamp(this.maxCollapse - visibleDespues);
        this.setHeaderOffsetVar(this.headerOffset);
        this.cdr.markForCheck(); // 👈 Marca para check manual
      });
      this.ro.observe(el);
    }
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    this.subs.forEach(s => s.unsubscribe());
    this.socketService.disconnect();
    if (this.ro) { 
      try { this.ro.disconnect(); } catch {} 
      this.ro = undefined; 
    }
  }

  // ===== Scroll handling =====
  onScroll(ev: any) {
    if (!this.maxCollapse) return;

    const y = ev?.detail?.scrollTop ?? 0;

    if (this.ignoreNextDelta) {
      this.lastScrollTop = y;
      this.ignoreNextDelta = false;
      return;
    }

    let dy = y - this.lastScrollTop;
    this.lastScrollTop = y;

    if (Math.abs(dy) < 0.5) return;

    let next = this.headerOffset + dy;
    if (y <= 0) next = 0;
    next = this.clamp(next);

    if (!this.raf) {
      this.raf = true;
      requestAnimationFrame(() => {
        this.headerOffset = next;
        this.setHeaderOffsetVar(this.headerOffset);
        this.raf = false;
      });
    } else {
      this.headerOffset = next;
    }
  }

  // ===== Utility methods =====
  private clamp(v: number) { 
    return Math.max(0, Math.min(this.maxCollapse, Math.round(v))); 
  }

  private async waitForToolbarReady() {
    if ('customElements' in window && (customElements as any).whenDefined) {
      try { await (customElements as any).whenDefined('ion-toolbar'); } catch {}
    }
    const toolbar = this.collapsibleRef?.nativeElement?.querySelector('ion-toolbar') as any;
    if (toolbar?.componentOnReady) { 
      try { await toolbar.componentOnReady(); } catch {} 
    }
    await new Promise<void>(r => requestAnimationFrame(() => r()));
  }

  private async ensureScrollEl() {
    if (!this.scrollEl) {
      await this.waitForToolbarReady();
      this.scrollEl = await this.pageContent.getScrollElement();
    }
  }

  private measureAndFixHeaderHeight() {
    const el = this.collapsibleRef?.nativeElement;
    if (!el) return;

    el.style.height = 'auto';
    let h = el.scrollHeight || el.getBoundingClientRect().height || 0;
    if (h < 1) h = 120;
    this.maxCollapse = Math.ceil(h);

    el.style.height = `${this.maxCollapse}px`;
    this.headerOffset = this.clamp(this.headerOffset);
    this.setHeaderOffsetVar(this.headerOffset);
  }

  private setHeaderOffsetVar(px: number) {
    const el = this.collapsibleRef?.nativeElement;
    if (!el) return;
    el.style.setProperty('--header-offset', `${px}px`);
  }

  // ===== Business logic methods =====
  async selectCategoria(valor: string) {
    if (valor === 'Filtros') { 
      await this.openFilters(); 
      return; 
    }
    
    const index = this.categoriasActivas.indexOf(valor);
    
    // ✅ Crear nuevo array en lugar de mutar
    if (index > -1) {
      this.categoriasActivas = this.categoriasActivas.filter((_, i) => i !== index);
    } else {
      this.categoriasActivas = [...this.categoriasActivas, valor];
    }

    // ✅ Crear nuevo objeto de filtros
    this.filters = this.categoriasActivas.length === 0
      ? { ...this.filters, categorias: undefined }
      : { ...this.filters, categorias: [...this.categoriasActivas] };

    await Haptics.impact({ style: ImpactStyle.Light });
    this.reloadSalas();
    this.cdr.markForCheck(); // 👈 Marca para check manual
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
      // ✅ Crear nuevos objetos
      this.filters = { ...this.filters, ...data };
      this.categoriasActivas = this.filters.categorias ? [...this.filters.categorias] : [];
      this.reloadSalas();
      this.cdr.markForCheck(); // 👈 Marca para check manual
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
    this.cdr.markForCheck(); // 👈 Marca para check manual
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
      delete filtros.lat; 
      delete filtros.lng; 
    } else { 
      filtros.lat = this.latUsuario; 
      filtros.lng = this.lngUsuario; 
    }
    return filtros;
  }

  reloadSalas() {
    this.pageContent?.scrollToTop(0);
    this.headerOffset = 0;
    this.setHeaderOffsetVar(0);
    this.lastScrollTop = 0;
    this.savedScrollTop = 0;
    this.savedHeaderOffset = 0;

    this.offset = 0;
    this.todasCargadas = false;
    this.cargando = true;

    const filtros = this.getFiltros(0);
    this.store.dispatch(new GetSalas(filtros)).subscribe({
      next: () => { 
        this.offset = this.limit; 
        this.cargando = false; 
        this.cdr.markForCheck(); // 👈 Marca para check manual
      },
      error: (err) => { 
        this.cargando = false; 
        console.error('Error al cargar salas', err); 
        this.cdr.markForCheck(); // 👈 Marca para check manual
      }
    });
  }

  loadMore(event?: any) {
    if (this.cargando || this.todasCargadas) { 
      event?.target?.complete(); 
      return; 
    }
    
    this.cargando = true;
    this.cdr.markForCheck(); // 👈 Marca para check manual

    const filtros = this.getFiltros(this.offset);
    this.store.dispatch(new AppendSalas(filtros)).subscribe((res: any) => {
      const recibidas = res.sala?.cantidad || 0;
      this.offset += recibidas;
      if (recibidas === 0 || recibidas < this.limit) {
        this.todasCargadas = true;
      }
      event?.target?.complete();
      this.cargando = false;
      this.cdr.markForCheck(); // 👈 Marca para check manual
    });
  }

  trackBySalaId(_i: number, sala: any): any { 
    return sala.id_sala; 
  }

  onMapaClick() {
    // Lee los filtros actuales de tu UI/estado de la lista y pásalos tal cual como queryParams
    // Ejemplo mínimo: si guardas filtros en this.filters
    const params = { ...this.filters };

    const distanciaActiva =
      params.distancia_km != null && params.distancia_km !== '' ? Number(params.distancia_km) :
      params.distancia != null && params.distancia !== '' ? Number(params.distancia) : null;

    if (distanciaActiva !== null && Number.isFinite(distanciaActiva)) {
      if (this.latUsuario != null && this.lngUsuario != null) {
        params.lat = this.latUsuario;
        params.lng = this.lngUsuario;
      } else if (this.filters?.lat != null && this.filters?.lng != null) {
        params.lat = this.filters.lat;
        params.lng = this.filters.lng;
      }
    }

    delete (params as any).coordenadas;

    this.router.navigate(['/mapa'], { queryParams: params });
    console.log('🗺️ Click en botón de mapa (a implementar)');
  }

  onNotificacionesClick() { 
    console.log('🔔 Notificaciones clickeadas'); 
  }

  get filtrosActivos(): number {
    const { ciudad, query, ...rest } = this.filters;
    let total = 0;
    Object.values(rest).forEach(value => {
      if (Array.isArray(value)) {
        total += value.length;
      } else if (value !== undefined && value !== null && value !== '' && value !== false) {
        total += 1;
      }
    });
    return total;
  }

  abrirSalaDetalle(id: number) {
    this.router.navigate(['/sala-detalle', id]);
  }
}