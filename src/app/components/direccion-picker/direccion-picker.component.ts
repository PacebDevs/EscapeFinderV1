// ==============================
// 🧭 DireccionPickerComponent.ts
// ==============================

import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UbicacionService, UbicacionResultado } from 'src/app/services/ubicacion.service';
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
  direccionActual: string | null = null;

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
        this.ubicacionService.autocomplete(texto.trim()).subscribe((res) => {
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

  seleccionar(prediccion: string) {
    this.ubicacionService.geocode(prediccion).subscribe({
      next: (res: UbicacionResultado) => {
        this.direccionActual = res.direccion;
        this.ciudadActual = res.ciudad;
        this.query = res.direccion;
        this.ciudadSeleccionada.emit(res.ciudad);
        this.abierto = false;
        this.predicciones = [];
        console.log(this.ciudadActual)
      },
      error: (err) => {
        console.error('Error geocodificando:', err);
        alert('No se pudo obtener la ciudad desde la dirección.');
      }
    });
  }

  async usarMiUbicacion() {
    try {
      const pos = await Geolocation.getCurrentPosition();
      this.ubicacionService.reverseGeocode(pos.coords.latitude, pos.coords.longitude).subscribe({
        next: (res: UbicacionResultado) => {
          this.direccionActual = res.direccion;
          this.ciudadActual = res.ciudad;
          this.query = res.direccion;
          this.ciudadSeleccionada.emit(res.ciudad);
          this.abierto = false;
          this.predicciones = [];
          console.log(this.ciudadActual)
          
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
    this.direccionActual = null;
    this.query = '';
    this.predicciones = [];
    this.abierto = false;
    this.ciudadSeleccionada.emit(null);
  }
}
