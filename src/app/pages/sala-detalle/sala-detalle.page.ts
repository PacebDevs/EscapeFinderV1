import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Store } from '@ngxs/store';
import { Sala } from 'src/app/models/sala.model';
import { SalaService } from 'src/app/services/sala.service';
import { UsuarioState } from 'src/app/states/usuario.state';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sala-detalle',
  templateUrl: './sala-detalle.page.html',
  styleUrls: ['./sala-detalle.page.scss'],
  standalone: false
})
export class SalaDetallePage implements OnInit, OnDestroy {
  sala: Sala | null = null;

  cargandoDatos = true;
  galleryReady = false;

  displayedImgs: string[] = [];
  allImgs: string[] = [];

  accesibilidadesAptas = ''; // <-- evita la función flecha en plantilla

  private cancelado = false;
  get baseUrl() { return environment.imageURL; }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private navCtrl: NavController,
    private salaService: SalaService,
    private store: Store
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const { lat, lng } = this.store.selectSnapshot(UsuarioState.ubicacion) || {};
    this.cargarSala(id, lat, lng);
  }

  ngOnDestroy() { this.cancelado = true; }

  volver() {
    if (window.history.length > 1) this.navCtrl.back();
    else this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
  }

  private cargarSala(id: number, lat?: number | null, lng?: number | null) {
    this.cargandoDatos = true;
    this.galleryReady = false;

    this.salaService.getSalaById(id, lat ?? null, lng ?? null).subscribe({
      next: (s) => {
        if (this.cancelado) return;
        this.sala = s;
        this.cargandoDatos = false;

        // Texto de accesibilidad (para no usar flechas en la plantilla)
        this.accesibilidadesAptas = (s.caracteristicas || [])
          .filter(c => c.tipo === 'accesibilidad' && c.es_apta)
          .map(c => c.nombre)
          .join(', ');

        // Imágenes
        const base = (u: string) => u?.startsWith('http') ? u : (this.baseUrl + (u || '').replace(/^\//,''));
        const cover = s.cover_url ? [base(s.cover_url)] : [];
        const galeria = (s.imagenes || []).map(i => base(i.url)).filter(Boolean);
        const set = new Set<string>([...cover, ...galeria]);
        this.allImgs = Array.from(set);

        this.displayedImgs = this.allImgs.length ? [this.allImgs[0]] : [];
        this.preloadGallery(this.allImgs);
      },
      error: (e) => {
        console.error('Error cargando sala', e);
        this.cargandoDatos = false;
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
        this.displayedImgs = [...this.allImgs];
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
}
