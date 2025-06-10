import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UbicacionService } from 'src/app/services/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-direccion-picker',
  templateUrl: './direccion-picker.component.html',
  styleUrls: ['./direccion-picker.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DireccionPickerComponent {
  @Output() ciudadSeleccionada = new EventEmitter<string | null>();

  abierto = false;
  query = '';
  predicciones: string[] = [];
  ciudadActual: string | null = null;

  constructor(private ubicacionService: UbicacionService) {}

  togglePanel() {
    this.abierto = !this.abierto;
    if (!this.abierto) {
      this.predicciones = [];
    }
  }

  buscar() {
    const texto = this.query.trim();
    if (!texto) {
      this.predicciones = [];
      return;
    }
    this.ubicacionService.buscarCiudad(texto).subscribe((res) => {
      this.predicciones = res || [];
    });
  }

  seleccionar(ciudad: string) {
    this.ciudadActual = ciudad;
    this.ciudadSeleccionada.emit(ciudad);
    this.abierto = false;
    this.predicciones = [];
  }

  usarMiUbicacion() {
    Geolocation.getCurrentPosition().then((pos) => {
      this.ubicacionService
        .ciudadDesdeCoords(pos.coords.latitude, pos.coords.longitude)
        .subscribe((res) => {
          if (res && res.length) {
            this.seleccionar(res[0]);
          }
        });
    });
  }

  borrar() {
    this.ciudadActual = null;
    this.query = '';
    this.predicciones = [];
    this.abierto = false;
    this.ciudadSeleccionada.emit(null);
  }
}