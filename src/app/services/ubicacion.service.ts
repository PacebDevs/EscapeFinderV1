// ==============================
// 🌐 src/app/services/ubicacion.service.ts
// ==============================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface UbicacionResultado {
  direccion: string;
  ciudad: string;
  lat: number;
  lng: number;
  // Nuevos campos proporcionados por el backend (opcionales para compatibilidad)
  via?: string | null;
  via_tipo?: string | null;
  via_nombre?: string | null;
  numero?: string | null;
  codigo_postal?: string | null;
  barrio?: string | null;
  provincia?: string | null;
  comunidad?: string | null;
  pais?: string | null;
  pais_code?: string | null;
  place_id?: string | null;
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
    return this.http
      .get<UbicacionResultado>(`${this.baseUrl}/geocode`, { params })
      .pipe(tap((res) => this.logUbicacionResultado('geocode', res)));
  }

  /** Desde coordenadas GPS */
  reverseGeocode(lat: number, lng: number): Observable<UbicacionResultado> {
    const params = new HttpParams().set('lat', lat.toString()).set('lng', lng.toString());
    return this.http
      .get<UbicacionResultado>(`${this.baseUrl}/reverse`, { params })
      .pipe(tap((res) => this.logUbicacionResultado('reverse', res)));
  }

  // Log estructurado de todos los campos que puede devolver el backend
  private logUbicacionResultado(context: 'geocode' | 'reverse', res: UbicacionResultado) {
    try {
      // agrupado y colapsado para no saturar la consola
      console.groupCollapsed(`UbicacionService:${context} UbicacionResultado`);
      console.log('direccion:', res.direccion);
      console.log('ciudad:', res.ciudad);
      console.log('lat:', res.lat);
      console.log('lng:', res.lng);
      console.log('via:', res.via ?? null);
      console.log('via_tipo:', res.via_tipo ?? null);
      console.log('via_nombre:', res.via_nombre ?? null);
      console.log('numero:', res.numero ?? null);
      console.log('codigo_postal:', res.codigo_postal ?? null);
      console.log('barrio:', res.barrio ?? null);
      console.log('provincia:', res.provincia ?? null);
      console.log('comunidad:', res.comunidad ?? null);
      console.log('pais:', res.pais ?? null);
      console.log('pais_code:', res.pais_code ?? null);
      console.log('place_id:', res.place_id ?? null);
      console.groupEnd();
    } catch {
      // fallback simple por si algo falla
      console.log(`UbicacionService:${context} UbicacionResultado:`, res);
    }
  }
}
