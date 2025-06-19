// ==============================
// 🌐 src/app/services/ubicacion.service.ts
// ==============================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface UbicacionResultado {
  direccion: string;
  ciudad: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private baseUrl = `${environment.apiUrl}/ubicacion`;

  constructor(private http: HttpClient) {}

  /** Autocompleta mientras se escribe */
  autocomplete(input: string): Observable<string[]> {
    const params = new HttpParams().set('input', input);
    return this.http.get<string[]>(`${this.baseUrl}/autocomplete`, { params });
  }

  /** Geocodifica una dirección seleccionada */
  geocode(description: string): Observable<UbicacionResultado> {
    const params = new HttpParams().set('description', description);
    return this.http.get<UbicacionResultado>(`${this.baseUrl}/geocode`, { params });
  }

  /** Desde coordenadas GPS */
  reverseGeocode(lat: number, lng: number): Observable<UbicacionResultado> {
    const params = new HttpParams().set('lat', lat.toString()).set('lng', lng.toString());
    return this.http.get<UbicacionResultado>(`${this.baseUrl}/reverse`, { params });
  }
}
