import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Sala } from '../models/sala.model';
import { Observable, map } from 'rxjs';
import { enrichSala } from '../utils/sala.utils';

@Injectable({ providedIn: 'root' })
export class SalaService {
  private baseUrl = `${environment.apiUrl}/salas`;

  constructor(private http: HttpClient) {}

  getSalas(filters: any = {}): Observable<Sala[]> {
    let params = new HttpParams();
    for (const key in filters) {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    }
    console.log(this.http.get<Sala[]>(this.baseUrl, { params }));
     return this.http.get<Sala[]>(this.baseUrl, { params }).pipe(
      map((salas) => salas.map(enrichSala))
    );
  }
  getSalaById(id: number, lat?: number | null, lng?: number | null): Observable<Sala> {
    let params = new HttpParams();
    if (Number.isFinite(lat as number) && Number.isFinite(lng as number)) {
      params = params.set('lat', String(lat)).set('lng', String(lng));
    }
    return this.http.get<Sala>(`${this.baseUrl}/${id}`, { params });
}


}
