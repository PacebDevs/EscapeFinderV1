import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Sala } from '../models/sala.model';
import { Observable } from 'rxjs';

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
    return this.http.get<Sala[]>(this.baseUrl, { params });
  }
}
