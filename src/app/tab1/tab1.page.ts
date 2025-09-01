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
    
// ── Config dinámica en FRACCIONES ──
REVEAL_START_FRAC = 1;      // hay que “tirar” ~100% del alto del header para armar
REQUIRED_HIDDEN_FRAC = 0.75;   // el header debe estar oculto ~75% para permitir snap
REVEAL_SNAP_FRAC = 0.25;       // la primera card a ~25% del alto del header del borde


// Derivados (se recalculan al medir el header)
private revealStartPx = 0;          // = maxCollapse * REVEAL_START_FRAC
private revealSnapPx  = 0;          // = maxCollapse * REVEAL_SNAP_FRAC
private minDeltaPx    = 0.75;       // umbral anti-microgesto dependiente de DPR

// Estado de gesto
private revealAccum = 0;
private revealArmed = false;
private lastDir: 1 | -1 | 0 = 0;    // dirección anterior del scroll: 1 = abajo, -1 = arriba


    constructor(
    private store: Store,
    private socketService: SocketService,
    private modalCtrl: ModalController
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

    this.reloadSalas();
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

  // ======== Arrastre 1:1 por DELTAS — solo transform, sin cambiar alturas en scroll ========
onScroll(ev: any) {
  const y = ev?.detail?.scrollTop ?? 0;
  if (!this.maxCollapse) return;

  const dy = y - this.lastY;
  this.lastY = y;

  const dir: 1 | -1 = dy > 0 ? 1 : -1;

  // 0) ignora micro-deltas (ruido)
  if (Math.abs(dy) < this.minDeltaPx) return;

  // 1) si cambia la dirección, resetea la “arma” del reveal
  if (dir !== this.lastDir) {
    this.revealAccum = 0;
    this.revealArmed = false;
    this.lastDir = dir;
  }

  if (dir === 1) {
    // 2) scroll hacia ABAJO → ocultar sin fricción
    this.revealAccum = 0;
    this.revealArmed = false;
    this.headerOffset = Math.min(this.maxCollapse, this.headerOffset + dy);
  } else {
    // 3) scroll hacia ARRIBA → revelar con histeresis
    const nearCardEdge = this.isFirstCardNearTop();
    const enoughHidden = this.headerOffset >= (this.maxCollapse * this.REQUIRED_HIDDEN_FRAC);

    if (!this.revealArmed) {
      // acumula el gesto hacia arriba
      this.revealAccum += (-dy); // dy < 0

      // Se arma si: a) se supera el umbral proporcional, o
      // b) hay snap (primera card en el borde) y el header estaba suficientemente oculto
      if (this.revealAccum >= this.revealStartPx || (nearCardEdge && enoughHidden)) {
        this.revealArmed = true;
      } else {
        return; // gesto pequeño aún → ignorar
      }
    }

    // Ya armado → revelar sin fricción
    this.headerOffset = Math.max(0, this.headerOffset + dy);

    // Si se abrió del todo, limpia estados
    if (this.headerOffset === 0) {
      this.revealArmed = false;
      this.revealAccum = 0;
    }
  }

  // 4) pintar usando rAF (sin subpíxel)
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

  // ── Derivados dinámicos ──
  this.revealStartPx = this.maxCollapse * this.REVEAL_START_FRAC;
  this.revealSnapPx  = this.maxCollapse * this.REVEAL_SNAP_FRAC;

  // Umbral anti-microgesto según densidad de pantalla
  const dpr = (window.devicePixelRatio || 1);
  // evita ruido: aprox 1px físico; sube ligeramente en dpr altos
  this.minDeltaPx = Math.max(0.5, 1.0 / dpr) * 1.2;
}


private isFirstCardNearTop(): boolean {
  if (!this.scrollEl) {
    console.log('Debug isFirstCardNearTop: No scrollEl');
    return false;
  }

  const scrollerTop = this.scrollEl.getBoundingClientRect().top;
  
  // Buscar en todo el documento, no solo en scrollEl
  // Esto es necesario porque las tarjetas pueden estar en shadow DOM o en otra parte del árbol DOM
  const cardsInDocument = document.querySelectorAll<HTMLElement>('app-sala-card, .sala-card, ion-card');
  
  // También buscar dentro de los shadow roots si es posible
  // (Este es un intento más avanzado de buscar dentro de componentes web)
  let shadowCards: HTMLElement[] = [];
  try {
    // Buscar dentro del contenedor principal de la página (ion-content)
    const ionContent = document.querySelector('ion-content');
    if (ionContent && ionContent.shadowRoot) {
      // Buscar las tarjetas dentro del shadow root de ion-content
      const shadowCardElements = ionContent.shadowRoot.querySelectorAll<HTMLElement>('app-sala-card, .sala-card, ion-card, .card');
      shadowCards = Array.from(shadowCardElements);
      
      // También buscar en los slots
      const slots = ionContent.shadowRoot.querySelectorAll('slot');
      slots.forEach(slot => {
        const assignedElements = slot.assignedElements();
        for (const el of assignedElements) {
          if (el.tagName === 'APP-SALA-CARD' || 
              (el as HTMLElement).classList.contains('sala-card') || 
              el.tagName === 'ION-CARD') {
            shadowCards.push(el as HTMLElement);
          }
          
          // Buscar también en los hijos directos de los elementos asignados
          el.querySelectorAll<HTMLElement>('app-sala-card, .sala-card, ion-card').forEach(child => {
            shadowCards.push(child);
          });
        }
      });
    }
  } catch (e) {
    console.warn('Error buscando en shadow DOM:', e);
  }
  
  // Combinar todas las tarjetas encontradas
  const allCards = [...Array.from(cardsInDocument), ...shadowCards];
  
  console.log(`Debug isFirstCardNearTop: scrollerTop=${scrollerTop}, cardsInDocument=${cardsInDocument.length}, shadowCards=${shadowCards.length}, revealSnapPx=${this.revealSnapPx}`);
  
  // Si no encontramos tarjetas, intentar detectar por el scrollTop
  if (allCards.length === 0) {
    // Ver el contenido DOM del documento para ayudar a diagnosticar
    console.log('Debug document body:', document.body.innerHTML.substring(0, 200) + '...');
    
    // Como fallback, evaluar basado en la posición de scroll
    // Si estamos cerca del inicio o en la parte superior, consideramos que la primera tarjeta está cerca
    const isNearTop = this.scrollEl.scrollTop < 20;
    if (isNearTop) {
      console.log('Fallback: Estamos en la parte superior, consideramos que hay una tarjeta cerca');
      return true;
    }
    
    // Otra estrategia: ver si hay elementos importantes cerca del borde superior
    const anyVisibleElements = document.elementsFromPoint(window.innerWidth/2, scrollerTop + this.revealSnapPx);
    const hasRelevantElement = anyVisibleElements.some(el => 
      el.tagName !== 'ION-HEADER' && 
      el.tagName !== 'ION-TOOLBAR' &&
      !el.classList.contains('collapsible')
    );
    
    if (hasRelevantElement) {
      console.log('Fallback: Hay elementos relevantes cerca del borde superior');
      return true;
    }
    
    console.log('Debug isFirstCardNearTop: No se encontraron tarjetas con ningún método');
    return false;
  }

  // Mostrar información de las tarjetas encontradas
  allCards.slice(0, 3).forEach((card, index) => {
    const cardTop = card.getBoundingClientRect().top;
    const topRel = cardTop - scrollerTop;
    console.log(`Debug tarjeta #${index}: tag=${card.tagName}, class=${card.className}, topRel=${topRel}, visible=${cardTop >= scrollerTop}`);
  });

  // Usar el algoritmo original para determinar si la primera tarjeta visible está cerca del borde superior
  for (const card of allCards) {
    const cardTop = card.getBoundingClientRect().top;
    const topRel = cardTop - scrollerTop;
    
    // Solo considerar tarjetas visibles (no por encima del borde superior)
    if (topRel >= 0) {
      const result = topRel <= this.revealSnapPx;
      console.log(`Debug isFirstCardNearTop: First visible card topRel=${topRel}, revealSnapPx=${this.revealSnapPx}, result=${result}`);
      return result;
    }
  }
  
  console.log('Debug isFirstCardNearTop: No card with topRel >= 0');
  return false;
}

  private setHeaderOffsetVar(px: number) {
    const el = this.collapsibleRef?.nativeElement;
    if (!el) return;
    el.style.setProperty('--header-offset', `${px}`);
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
}
