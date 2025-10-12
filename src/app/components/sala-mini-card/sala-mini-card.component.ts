import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges, OnChanges } from '@angular/core';
import { SalaPinDTO } from 'src/app/services/map.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sala-mini-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sala-mini-card.component.html',
  styleUrls: ['./sala-mini-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaMiniCardComponent implements OnChanges{
  @Input() sala!: SalaPinDTO;
  @Output() focusSala = new EventEmitter<number>();

  imageSrc = 'assets/placeholder.jpg';
  
  get direccionLabel(): string | null {
    const sala = this.sala;
    if (!sala) {
      return null;
    }

    const direccion = sala.direccion?.trim();
    const nombreVia = sala.nombre_via?.trim();
    const ciudad = sala.ciudad?.trim();

    const base = direccion || nombreVia;
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

  onClick(): void {
    if (this.sala?.id_sala != null) {
      this.focusSala.emit(this.sala.id_sala);
    }
  }
}