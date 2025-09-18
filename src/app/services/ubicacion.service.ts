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
  // Campos opcionales (compatibilidad con backend enriquecido)
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
  private sessionId = UbicacionService.ensureSessionId();

  constructor(private http: HttpClient) {}

  /**
   * Autocompleta mientras se escribe.
   * Importante: NO recortamos el input; enviamos tal cual (espacio final incluido).
   * El backend hará coalescing/debounce por sesión y token-closing.
   */
  autocomplete(input: string): Observable<string[]> {
    const params = new HttpParams().set('input', input ?? '');
    return this.http.get<string[]>(`${this.baseUrl}/autocomplete`, {
      params,
      headers: { 'X-Session-Id': this.sessionId }
    }).pipe(
      tap(predictions => this.logAutocompletePredictions(input, predictions))
    );
  }

  /** Geocodifica una dirección seleccionada */
  geocode(description: string): Observable<UbicacionResultado> {
    const params = new HttpParams().set('description', description);
    return this.http
      .get<UbicacionResultado>(`${this.baseUrl}/geocode`, {
        params,
        headers: { 'X-Session-Id': this.sessionId }
      })
      .pipe(tap((res) => this.logUbicacionResultado('geocode', res)));
  }

  /** Desde coordenadas GPS */
  reverseGeocode(lat: number, lng: number): Observable<UbicacionResultado> {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lng', String(lng));

    return this.http
      .get<UbicacionResultado>(`${this.baseUrl}/reverse`, {
        params,
        headers: { 'X-Session-Id': this.sessionId }
      })
      .pipe(tap((res) => this.logUbicacionResultado('reverse', res)));
  }

  // ======================================
  // Utils
  // ======================================

  /** Genera/recupera un SessionId estable (persistido en localStorage) */
  private static ensureSessionId(): string {
    try {
      const key = 'ef_session_id';
      const existing = localStorage.getItem(key);
      if (existing) return existing;

      const generated = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

      localStorage.setItem(key, generated);
      return generated;
    } catch {
      // Fallback (SSR / private mode)
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  // Log estructurado de todos los campos que puede devolver el backend
  private logUbicacionResultado(context: 'geocode' | 'reverse', res: UbicacionResultado) {
    try {
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
      console.log(`UbicacionService:${context} UbicacionResultado:`, res);
    }
  }

  // Log de predicciones de autocompletado
  private logAutocompletePredictions(input: string, predictions: string[]) {
    try {
      console.groupCollapsed(`UbicacionService:autocomplete [${input}]`);
      console.log('Input:', input);
      console.log('Cantidad de predicciones:', predictions.length);
      console.log('Predicciones:', predictions);
      console.groupEnd();
    } catch {
      console.log(`UbicacionService:autocomplete [${input}]`, predictions);
    }
  }
}
