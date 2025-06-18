import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UbicacionService } from 'src/app/services/ubicacion.service';
import { Geolocation } from '@capacitor/geolocation';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-direccion-picker',
  templateUrl: './direccion-picker.component.html',
  styleUrls: ['./direccion-picker.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DireccionPickerComponent implements OnInit, OnDestroy {
  @Output() ciudadSeleccionada = new EventEmitter<string | null>();

  abierto = false;
  query = '';
  predicciones: string[] = [];
  ciudadActual: string | null = null;
  private queryChanged = new Subject<string>();
  private querySub?: Subscription;

  constructor(private ubicacionService: UbicacionService) {}

  ngOnInit() {
    this.querySub = this.queryChanged
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => {
        if (!texto.trim()) {
          this.predicciones = [];
          return;
        }
        const params = texto.trim();
        this.ubicacionService.buscarCiudad(params).subscribe((res) => {
          this.predicciones = res || [];
        });
      });
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
  }

  togglePanel() {
    this.abierto = !this.abierto;
    if (!this.abierto) {
      this.predicciones = [];
    }
  }

  buscar() {
    this.queryChanged.next(this.query);
  }

  seleccionar(ciudad: string) {
    this.ciudadActual = ciudad;
    this.ciudadSeleccionada.emit(ciudad);
    this.abierto = false;
    this.predicciones = [];
  }

  async usarMiUbicacion() {
    try {
      const pos = await Geolocation.getCurrentPosition();
      this.ubicacionService
        .ciudadDesdeCoords(pos.coords.latitude, pos.coords.longitude)
        .subscribe({
          next: (res) => {
            if (res && res.length) this.seleccionar(res[0]);
          },
          error: (err) => {
            console.error('Error geolocalización backend:', err);
            alert('No se pudo obtener la ciudad desde tu ubicación.');
          }
        });
    } catch (err) {
      console.error('Error obteniendo ubicación del dispositivo:', err);
      alert('No se pudo acceder al GPS. Verificá permisos.');
    }
  }

  borrar() {
    this.ciudadActual = null;
    this.query = '';
    this.predicciones = [];
    this.abierto = false;
    this.ciudadSeleccionada.emit(null);
  }
}
