import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';

@Component({
  selector: 'app-filters-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule ],
  templateUrl: './filters-modal.component.html',
  styleUrls: ['./filters-modal.component.scss']
})
export class FiltersModalComponent implements OnInit {
  @Input() filtrosActuales: any = {};
 // distancia: number = 10;
  filtros: any = {
    jugadores: null,
    tipo_sala: [] // nuevo filtro
  };
jugadoresOpciones = [2, 3, 4, 5, 6, 7, 8, 9, 10]; // ahora incluye hasta 10
tiposSalaOpciones = [
  'Al aire libre',
  'Escape Room',
  'Experiencia',
  'Hall game',
  'Juego portátil',
  'Realidad Virtual'
];
mostrarTiposSala = false;
  constructor(private modalCtrl: ModalController, private store: Store) {}

ngOnInit() {
  this.filtros = {
    ...this.filtros,
    ...this.filtrosActuales
  };
}

  dismiss() {
    this.modalCtrl.dismiss(); // sin cambios
  }

  aplicarFiltros() {
    //this.store.dispatch(new SetDistanciaFiltro(this.distancia));
    this.modalCtrl.dismiss(this.filtros);
  }
resetearFiltros() {
  const ciudad = this.filtros.ciudad; // preservamos ciudad
  this.filtros = {
    ciudad,      // mantenemos solo ciudad
    jugadores: null, // valores por defecto
    tipo_sala: [] // reset tipo_sala
   
  };
  
}

toggleTipoSala(tipo: string) {
  const idx = this.filtros.tipo_sala.indexOf(tipo);
  if (idx > -1) {
    this.filtros.tipo_sala.splice(idx, 1);
  } else {
    this.filtros.tipo_sala.push(tipo);
  }
}
}