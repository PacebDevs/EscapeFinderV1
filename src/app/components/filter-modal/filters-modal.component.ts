import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filters-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule ],
  templateUrl: './filters-modal.component.html',
  styleUrls: ['./filters-modal.component.scss']
})
export class FiltersModalComponent implements OnInit {
  @Input() filtrosActuales: any = {};

  filtros: any = {
    jugadores: 1 // valor por defecto
  };

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    // Inicializa con los filtros actuales si existen
    this.filtros = {
      ...this.filtros,
      ...this.filtrosActuales
    };
  }

  dismiss() {
    this.modalCtrl.dismiss(); // sin cambios
  }

  aplicarFiltros() {
    this.modalCtrl.dismiss(this.filtros);
  }
}
