// src/app/services/map.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FiltrosBusqueda } from '../models/filtros.model';

export interface SalaPinDTO {
  id_sala: number;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  cover_url: string | null;
  precio_min_pp: number | null;
  distancia_km?: number | null;
}

@Injectable({ providedIn: 'root' })
export class MapService {
  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  getSalasMap(filters: FiltrosBusqueda): Observable<SalaPinDTO[]> {
    let params = new HttpParams();

    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;

      if (Array.isArray(v)) {
        if (v.length) params = params.set(k, v.join(','));
        return;
      }
      if (typeof v === 'boolean') {
        params = params.set(k, v ? 'true' : 'false');
        return;
      }
      // numbers o strings
      params = params.set(k, String(v));
    });

    return this.http.get<SalaPinDTO[]>(`${this.baseUrl}/salas-map`, { params });
  }
}
