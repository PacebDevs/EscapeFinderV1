import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UbicacionService {
  private baseUrl = `${environment.apiUrl}/ubicacion`;

  constructor(private http: HttpClient) {}

  buscarCiudad(query: string): Observable<string[]> {
    console.log('Esta es la url utilzada ' + this.baseUrl)
    const params = new HttpParams().set('query', query);
    return this.http.get<string[]>(this.baseUrl, { params });
  }

  ciudadDesdeCoords(lat: number, lng: number): Observable<string[]> {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lng', String(lng));
    return this.http.get<string[]>(this.baseUrl, { params });
  }
}