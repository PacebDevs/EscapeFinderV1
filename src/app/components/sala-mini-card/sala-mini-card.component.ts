import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SalaPinDTO } from 'src/app/services/map.service';

@Component({
  selector: 'app-sala-mini-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sala-mini-card.component.html',
  styleUrls: ['./sala-mini-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaMiniCardComponent {
  @Input() sala!: SalaPinDTO;
  @Output() focusSala = new EventEmitter<number>();

  onClick(): void {
    if (this.sala?.id_sala != null) {
      this.focusSala.emit(this.sala.id_sala);
    }
  }
}