import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Sala } from '../models/sala.model';

export interface SalaFavorita extends Sala {
  fecha_favorito?: string;
}

export interface FavoritosResponse {
  count: number;
  favoritos: SalaFavorita[];
}

export interface FavoritoIdsResponse {
  ids: number[];
}

export interface ToggleFavoritoResponse {
  mensaje: string;
  action: 'added' | 'removed';
  isFavorite: boolean;
  id_sala: number;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private readonly API_URL = `${environment.apiUrl}/favoritos`;

  constructor(private http: HttpClient) {}

  getFavoritos(coordenadas?: { lat: number; lng: number }): Observable<FavoritosResponse> {
    const params = coordenadas 
      ? { lat: coordenadas.lat.toString(), lng: coordenadas.lng.toString() }
      : {};
    
    return this.http.get<FavoritosResponse>(this.API_URL, { params });
  }

  getFavoritoIds(): Observable<FavoritoIdsResponse> {
    return this.http.get<FavoritoIdsResponse>(`${this.API_URL}/ids`);
  }

  toggleFavorito(id_sala: number): Observable<ToggleFavoritoResponse> {
    return this.http.post<ToggleFavoritoResponse>(`${this.API_URL}/${id_sala}/toggle`, {});
  }
}
