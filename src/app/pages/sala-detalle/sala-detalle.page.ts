import { Component, OnDestroy, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Store } from '@ngxs/store';
import { Sala } from 'src/app/models/sala.model';
import { SalaService } from 'src/app/services/sala.service';
import { AuthState } from 'src/app/states/auth.state';
import { FavoritosState, ToggleFavorito } from 'src/app/states/favoritos.state';
import { environment } from 'src/environments/environment';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-sala-detalle',
  templateUrl: './sala-detalle.page.html',
  styleUrls: ['./sala-detalle.page.scss'],
  standalone: false
})
export class SalaDetallePage implements OnInit, OnDestroy, AfterViewChecked {
  sala: Sala | null = null;

  isFavorito = false;
  private favSub?: Subscription;
  cargandoDatos = true;
  galleryReady = false;

  displayedImgs: string[] = [];
  allImgs: string[] = [];

  accesibilidadesAptas = '';           // ...existing code...
  accesibilidades: string[] = [];      // NUEVO

  private cancelado = false;
  get baseUrl() { return environment.imageURL; }

  descExpanded = false;
  isDescOverflow = false;
  // private readonly DESC_CHAR_THRESHOLD = 800;  // <-- ya no se usa (por líneas)
  @ViewChild('descRef') private descRef?: ElementRef<HTMLParagraphElement>;
  private pendingOverflowCheck = false;

  priceTableExpanded = false;
  hasPriceOverflow = false;

  distanciaKm: number | null = null;
  private userLat: number | null = null;
  private userLng: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private salaService: SalaService,
    private store: Store
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const { lat, lng } = this.store.selectSnapshot(AuthState.ubicacion) || {};
    this.userLat = lat ?? null;
    this.userLng = lng ?? null;
    this.cargarSala(id, lat, lng);
  }

  ngAfterViewChecked() {
    if (this.pendingOverflowCheck) {
      this.pendingOverflowCheck = false;
      this.checkDescripcionOverflow();
    }
  }

  ngOnDestroy() { 
    this.cancelado = true; 
    this.favSub?.unsubscribe();
  }

  volver() {
    if (window.history.length > 1) this.navCtrl.back();
    else this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }

private cargarSala(id: number, lat?: number | null, lng?: number | null) {
  this.cargandoDatos = true;
  this.galleryReady = false;
  this.distanciaKm = null;
  this.salaService.getSalaById(id, lat ?? null, lng ?? null).subscribe({
    next: (s) => {
      if (this.cancelado) return;
      this.sala = s;
      this.cargandoDatos = false;
      
      // Procesar URL del mapa estático
      if (s.mapa_estatico_url && !s.mapa_estatico_url.startsWith('http')) {
        s.mapa_estatico_url = this.baseUrl + s.mapa_estatico_url.replace(/^\//, '');
      }

      // Extraer solo accesibilidades aptas
      this.accesibilidades = (s.caracteristicas || [])
        .filter(c => c.tipo === 'accesibilidad' && c.es_apta)
        .map(c => c.nombre);
      
      // Ya no evaluamos por nº de caracteres, siempre reset y luego medimos el DOM
      this.descExpanded = false;
      this.isDescOverflow = false;
      this.priceTableExpanded = false;
      this.hasPriceOverflow = (s.precios_por_jugadores?.length || 0) > 6;

      this.cargandoDatos = false;

      // ---- Imágenes (DOM estable) ----
      const base = (u: string) =>
        u?.startsWith('http') ? u : (this.baseUrl + (u || '').replace(/^\//, ''));

      const cover   = s.cover_url ? [base(s.cover_url)] : [];
      const galeria = (s.imagenes || []).map(i => base(i.url)).filter(Boolean);

      // Evita duplicados (cover repetida)
      const set = new Set<string>([...cover, ...galeria]);
      this.allImgs = Array.from(set);

      // ✅ Renderiza TODAS las imágenes desde el principio
      this.displayedImgs = [...this.allImgs];

      // Preload: sólo controla el overlay (no cambia el nº de slides)
      if (this.allImgs.length <= 1) {
        this.galleryReady = true; // sin overlay si hay 0/1 imagen
      } else {
        this.preloadGallery(this.allImgs);
      }

      // ---- Favorito: suscripción por sala ----
      this.favSub?.unsubscribe();
      this.favSub = this.store.select(FavoritosState.ids).pipe(
        map(ids => ids.includes(s.id_sala))
      ).subscribe(v => this.isFavorito = v);

      // Marcar que tras render se mida overflow (líneas)
      this.pendingOverflowCheck = true;

      // Distancia: usa exclusivamente la del backend
      const rawDist = (s as any)?.distancia_km ?? (s as any)?.distancia ?? null;
      this.distanciaKm = (rawDist !== null && rawDist !== undefined && rawDist !== '')
        ? Number(rawDist)
        : null;

    },
    error: (e) => {
      console.error('Error cargando sala', e);
      this.cargandoDatos = false;
      this.allImgs = [];
      this.displayedImgs = [];
      this.galleryReady = true;
    }
  });
}


  private preloadGallery(urls: string[]) {
    if (urls.length <= 1) { this.galleryReady = true; return; }

    let loaded = 0;
    const onDone = () => {
      loaded++;
      if (loaded >= urls.length) {
        this.galleryReady = true;
      }
    };

    urls.forEach(u => {
      const img = new Image();
      img.onload = onDone; img.onerror = onDone;
      img.src = u;
    });
  }

  get tienePrecioPP(): boolean {
    return !!(this.sala?.precio_min_pp || this.sala?.precio_max_pp || (this.sala?.precios_por_jugadores?.length));
  }

  trackByUrl(_i: number, u: string) { return u; }

  async toggleFavorito(event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();

    const target = (event?.target as HTMLElement) ?? null;
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}

    if (target) {
      target.classList.add('pulse-animation');
      setTimeout(() => target.classList.remove('pulse-animation'), 300);
    }
    // Dispatch acción NGXS
    this.store.dispatch(new ToggleFavorito(this.sala!.id_sala));
  }

  togglePriceTable() {
    this.priceTableExpanded = !this.priceTableExpanded;
  }

  toggleDescripcion() {
    this.descExpanded = !this.descExpanded;
    if (!this.descExpanded) this.pendingOverflowCheck = true;
  }

  private checkDescripcionOverflow() {
    if (!this.descRef || this.descExpanded) return;
    const el = this.descRef.nativeElement;
    // Si el contenido real (scrollHeight) excede el alto visible (clientHeight) => overflow
    this.isDescOverflow = el.scrollHeight - el.clientHeight > 2;
  }

  getAccIcon(nombre: string): string {
    const n = (nombre || '').toLowerCase();
    if (n.includes('sign') || n.includes('señas') || n.includes('lengua')) return 'hand-left-outline';
    if (n.includes('audit') || n.includes('oído') || n.includes('sonido')) return 'ear-outline';
    if (n.includes('visual') || n.includes('visión') || n.includes('ciego')) return 'eye-outline';
    if (n.includes('movilidad') || n.includes('rueda')) return 'accessibility-outline';
    return 'accessibility-outline';
  }

  async abrirEnMapas(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();

    // Construir la dirección textual
    const partes = [
      this.sala?.tipo_via,
      this.sala?.nombre_via,
      this.sala?.numero,
      this.sala?.ciudad,
      this.sala?.codigo_postal
    ]
      .filter(Boolean)
      .join(' ');
    
    const direccion = partes || this.sala?.nombre || '';
    const q = encodeURIComponent(direccion);
    
    // URL para navegador web (fallback)
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
    
    // Verificar la plataforma
    const platform = Capacitor.getPlatform();
    
    try {
      if (platform === 'ios') {
        // En iOS, abrir Apple Maps (nativo)
        window.location.href = `maps://?q=${q}`;
        
        // Fallback a navegador
        setTimeout(() => {
          window.open(webUrl, '_blank');
        }, 500);
      } else if (platform === 'android') {
        // En Android, usar la URL web específica de Google Maps
        const intentUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
        
        // Simplemente usar window.open para Android
        window.open(intentUrl, '_blank');
      } else {
        // En web
        window.open(webUrl, '_blank');
      }
    } catch (error) {
      console.error('Error al abrir la aplicación de mapas:', error);
      window.open(webUrl, '_blank');
    }
  }


}
