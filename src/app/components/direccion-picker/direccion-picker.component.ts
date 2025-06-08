import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
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

  constructor(private http: HttpClient) {}

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
    const params = new HttpParams().set('query', texto);
    this.http
      .get<string[]>(`${environment.apiUrl}/ubicacion`, { params })
      .subscribe((res) => {
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
      const params = new HttpParams()
        .set('lat', String(pos.coords.latitude))
        .set('lng', String(pos.coords.longitude));
      this.http
        .get<string[]>(`${environment.apiUrl}/ubicacion`, { params })
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