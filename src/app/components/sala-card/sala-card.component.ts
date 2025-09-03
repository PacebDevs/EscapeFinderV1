import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter 
} from '@angular/core';
import { Sala } from 'src/app/models/sala.model';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FavoritosService } from 'src/app/services/favoritos.service';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * SalaCardComponent
 *
 * Componente que representa visualmente una sala de escape.
 * Muestra skeleton mientras se carga la imagen, incluyendo retardo mínimo visual.
 * Resetea el estado visual cuando la sala cambia (Input muta sin destruir el componente).
 */
@Component({
  selector: 'app-sala-card',
  standalone: true,
  templateUrl: './sala-card.component.html',
  styleUrls: ['./sala-card.component.scss'],
  imports: [CommonModule, IonicModule]
})
export class SalaCardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() sala!: Sala;
  @ViewChild('favoriteIcon') favoriteIconRef!: ElementRef;
  @Output() open = new EventEmitter<number>(); // <-- NUEVO

  isFavorito = false;
  loadingImage = true;

  // Tiempo mínimo que el skeleton debe estar visible, en milisegundos.
  private skeletonDelay = 400;
  private imageLoadStart = 0;

  private favoritoSub?: Subscription;
  private animationFrameId: number | null = null;

  fallbackImage = 'assets/escapeImagen.png';
  currentImage = '';
  private urlImage = environment.imageURL;

  constructor(
    private favoritosService: FavoritosService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Se llama cuando el componente se inicializa por primera vez.
   */
  ngOnInit() {
    this.resetCard(); // inicialización de imagen y skeleton

    this.favoritoSub = this.favoritosService
      .getFavoritoStatusStream(this.sala.id_sala)
      .subscribe(isFav => {
        this.isFavorito = isFav;
        this.cdr.markForCheck();
      });
  }

  /**
   * Detecta cambios en el input `sala` (cuando Angular reutiliza la card).
   * Esto es necesario porque Angular NO destruye el componente si se usa `trackBy`.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sala'] && !changes['sala'].firstChange) {
      this.resetCard(); // reiniciar imagen y skeleton al recibir nueva sala
    }
  }

  ngOnDestroy() {
    this.favoritoSub?.unsubscribe();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  /**
   * Inicializa la imagen y fuerza la visualización del skeleton con retardo mínimo.
   */
  private resetCard() {
    this.loadingImage = true;
    this.imageLoadStart = performance.now();

    this.currentImage = this.sala.cover_url
      ? this.urlImage + this.sala.cover_url
      : this.fallbackImage;

    const img = new Image();
    img.src = this.currentImage;
    img.onload = () => this.onImageLoad();
    img.onerror = () => this.onImageError();
  }

  /**
   * Evento lanzado cuando la imagen se ha cargado (o el fallback).
   * Asegura un mínimo de tiempo para que el skeleton sea visible.
   */
  onImageLoad() {
    const elapsed = performance.now() - this.imageLoadStart;
    const remaining = Math.max(this.skeletonDelay - elapsed, 0);

    setTimeout(() => {
      this.loadingImage = false;
      this.cdr.markForCheck(); // forzar redibujo en caso de imagen rápida
    }, remaining);
  }

  /**
   * Si la imagen falla, se usa una imagen por defecto.
   * También se asegura que se dispare `onImageLoad()` aunque falle la carga original.
   */
  onImageError() {
    if (this.currentImage !== this.fallbackImage) {
      this.currentImage = this.fallbackImage;

      const fallback = new Image();
      fallback.src = this.fallbackImage;
      fallback.onload = () => this.onImageLoad();
    } else {
      this.loadingImage = false;
    }
  }

  /**
   * Marca o desmarca una sala como favorita, con feedback háptico y animación.
   */
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

  /**
   * Formatea la distancia para mostrarla en la tarjeta de la sala.
   * Si la distancia es menor a 1 km, se muestra en metros.
   * Si es 1 km o más, se muestra con un decimal.
   */
  formatDistancia(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  // NUEVA FUNCIÓN para formatear el rango de precios
  formatPrecio(min?: number, max?: number): string {
    if (min && max) {
      if (min === max) {
        return `${min}€`;
      }
      return `${min}€ - ${max}€`;
    }
    if (min) {
      return `${min}€`;
    }
    if (max) {
      return `${max}€`;
    }
    return 'N/A';
  }

 
  
  onOpen() {
    // Si el click vino desde el icono favorito, ya hiciste stopPropagation() ahí
    if (this.sala?.id_sala) this.open.emit(this.sala.id_sala);
  }
}

