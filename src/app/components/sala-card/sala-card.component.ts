import {
  Component, Input, ViewChild, ElementRef, ChangeDetectorRef,
  OnDestroy, OnInit, EventEmitter, Output
} from '@angular/core';
import { Sala } from 'src/app/models/sala.model';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FavoritosService } from 'src/app/services/favoritos.service';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sala-card',
  standalone: true,
  templateUrl: './sala-card.component.html',
  styleUrls: ['./sala-card.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class SalaCardComponent implements OnInit, OnDestroy {
  @Input() sala!: Sala;
  @Output() imagenCargada = new EventEmitter<void>();
  @ViewChild('favoriteIcon') favoriteIconRef!: ElementRef;

  isFavorito = false;
  loadingImage = true;
  private favoritoSub?: Subscription;
  private animationFrameId: number | null = null;
  

  fallbackImage = 'assets/escapeImagen.png';
  currentImage = '';
  private urlImage = environment.imageURL;
  private imagenCargadaEmitida = false;

  constructor(
    private favoritosService: FavoritosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentImage = this.urlImage+this.sala.cover_url || this.fallbackImage;

    this.favoritoSub = this.favoritosService
      .getFavoritoStatusStream(this.sala.id_sala)
      .subscribe(isFav => {
        this.isFavorito = isFav;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy() {
    this.favoritoSub?.unsubscribe();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  get coverSrc(): string {
    return this.currentImage;
  }

 onImageLoad() {
    if (!this.imagenCargadaEmitida) {
      //console.log('✅ Imagen cargada:', this.sala.nombre);
      this.loadingImage = false;
      this.imagenCargada.emit();
      this.imagenCargadaEmitida = true;
    }
  }

  onImageError() {
    if (this.currentImage !== this.fallbackImage) {
      this.currentImage = this.fallbackImage;
      setTimeout(() => this.onImageLoad(), 0); // 🔁 Forzar visibilidad
    } else {
      this.loadingImage = false;
      if (!this.imagenCargadaEmitida) {
        this.imagenCargada.emit();
        this.imagenCargadaEmitida = true;
      }
    }
  }

  async toggleFavorito(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const target = event.target as HTMLElement;
    if (!target) return;

    target.style.transform = 'scale(1)';
    await Haptics.impact({ style: ImpactStyle.Light });

    this.animationFrameId = requestAnimationFrame(() => {
      target.classList.add('pulse-animation');
      this.favoritosService.toggleFavorito(this.sala.id_sala);
      setTimeout(() => {
        target.classList.remove('pulse-animation');
        this.animationFrameId = null;
      }, 300);
    });
  }
}
