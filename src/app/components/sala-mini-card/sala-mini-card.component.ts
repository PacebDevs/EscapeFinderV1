import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { SalaPinDTO } from 'src/app/services/map.service';
import { environment } from 'src/environments/environment';
import { ViaAbrevPipe } from 'src/app/pipes/via-abrev.pipe'; 


@Component({
  selector: 'app-sala-mini-card',
  standalone: true,
  imports: [CommonModule, ViaAbrevPipe],
  templateUrl: './sala-mini-card.component.html',
  styleUrls: ['./sala-mini-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaMiniCardComponent implements OnChanges{
  @Input() sala!: SalaPinDTO;
  @Output() focusSala = new EventEmitter<number>();

  imageSrc = 'assets/placeholder.jpg';

  get precioLabel(): string | null {
    const sala = this.sala;
    if (!sala) return null;

    if (sala.tipo_precio === 'por_persona' || sala.precio_min_pp != null || sala.precio_max_pp != null) {
      const rango = this.formatPrecio(sala.precio_min_pp, sala.precio_max_pp);
      return rango ? `${rango} €/persona` : null;
    }

    const rango = this.formatPrecio(sala.precio_min_total, sala.precio_max_total);
    return rango ? `${rango} € total` : null;
  }
  
  get direccionLabel(): string | null {
    const sala = this.sala;
    if (!sala) {
      return null;
    }

    const tipoVia = sala.tipo_via?.trim();
    const numero = sala.numero?.trim();
    const ampliacion = sala.ampliacion?.trim();
    const codigoPostal = sala.codigo_postal?.trim();
    const nombreVia = sala.nombre_via?.trim();
    const ciudad = sala.ciudad?.trim();

    const base =  tipoVia + " " + nombreVia;
    if (base && ciudad) {
      return base.includes(ciudad) ? base : `${base} · ${ciudad}`;
    }

    return base || ciudad || null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sala']) {
      this.updateImageSrc();
    }
  }

  private updateImageSrc(): void {
    const cover = this.sala?.cover_url?.trim();
    if (!cover) {
      this.imageSrc = 'assets/placeholder.jpg';
      return;
    }

    const isAbsolute = /^https?:\/\//i.test(cover);
    if (isAbsolute) {
      this.imageSrc = cover;
      return;
    }

    const base = environment.imageURL.replace(/\/$/, '');
    const path = cover.replace(/^\//, '');
    this.imageSrc = `${base}/${path}`;
  }

  private formatPrecio(
    min: number | string | null,
    max: number | string | null
  ): string | null {
    const minValue = this.normalizarPrecio(min);
    const maxValue = this.normalizarPrecio(max);
    if (minValue !== null && maxValue !== null) {
      return minValue === maxValue ? `${minValue}` : `${minValue}-${maxValue}`;
    }
    if (minValue !== null) return `${minValue}`;
    if (maxValue !== null) return `${maxValue}`;
    return null;
  }

  private normalizarPrecio(value: number | string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  onClick(): void {
    if (this.sala?.id_sala != null) {
      this.focusSala.emit(this.sala.id_sala);
    }
  }
}
