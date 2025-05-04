// src/app/services/favoritos.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS } from '../constants/storage.keys';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private favoritosSubject = new BehaviorSubject<number[]>([]);
  favoritos$ = this.favoritosSubject.asObservable(); // expone solo lectura

  constructor() {
    this.loadFavoritos(); // cuando se crea el servicio
  }

  private async loadFavoritos() {
    const { value } = await Preferences.get({ key: STORAGE_KEYS.FAVORITOS_SALAS });
    const ids = value ? JSON.parse(value) : [];
    this.favoritosSubject.next(ids);
  }

  async toggleFavorito(id: number) {
    const current = this.favoritosSubject.value;
    const updated = current.includes(id)
      ? current.filter(favId => favId !== id)
      : [...current, id];

    this.favoritosSubject.next(updated);
    await Preferences.set({
      key: STORAGE_KEYS.FAVORITOS_SALAS,
      value: JSON.stringify(updated)
    });
  }

  isFavorito(id: number): boolean {
    return this.favoritosSubject.value.includes(id);
  }

  getFavoritoStatusStream(id: number) {
    return this.favoritos$.pipe(
      map(favoritos => favoritos.includes(id))
    );
  }
}
