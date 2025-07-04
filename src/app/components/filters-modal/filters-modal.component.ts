import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-filters-modal',
  templateUrl: './filters-modal.component.html',
  styleUrls: ['./filters-modal.component.scss'],
  standalone:false
})
export class FiltersModalComponent {
  @Input() filters: any;

  dificultad: string = '';
  jugadores: number | null = null;

  constructor(private modalCtrl: ModalController) {}

  cerrar() {
    this.modalCtrl.dismiss();
  }

  aplicarFiltros() {
    this.modalCtrl.dismiss({
      dificultad: this.dificultad,
      jugadores: this.jugadores
    });
  }
}
