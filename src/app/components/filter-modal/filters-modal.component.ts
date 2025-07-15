import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { ClearDistanciaFiltro,  UsuarioState } from 'src/app/states/usuario.state';

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
    jugadores: 4 // valor por defecto
  };


  constructor(private modalCtrl: ModalController, private store: Store) {}

ngOnInit() {
 // const distanciaState = this.store.selectSnapshot(UsuarioState.ubicacion)?.distanciaKm;
 // this.distancia = distanciaState ?? this.distancia;

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
  this.filtros = {
    jugadores: 4
    // cualquier otro filtro que quieras resetear aquí
  };
 // this.distancia = 10;
  //this.store.dispatch(new ClearDistanciaFiltro());
}

}
