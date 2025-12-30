import { State, Action, StateContext, Selector, NgxsOnInit } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { FavoritosService, SalaFavorita } from '../services/favoritos.service';
import { Preferences } from '@capacitor/preferences';

export { SalaFavorita } from '../services/favoritos.service';

const STORAGE_KEY = 'favoritos_ids';

// Modelo del estado de favoritos
export interface FavoritosStateModel {
  ids: number[];                    // IDs de salas favoritas (ligero, para verificaciones rápidas)
  favoritos: SalaFavorita[];        // Información completa de salas favoritas
  loaded: boolean;                  // Indica si ya se cargaron los datos
  loading: boolean;                 // Indica si está cargando
  toggleRequestCounter: number;     // Contador monotónico para ordenar respuestas de toggle
  pendingToggles: Record<number, number>; // requestId por id_sala (último toggle en vuelo)
}

// Acciones
export class LoadFavoritoIds {
  static readonly type = '[Favoritos] Load Favorito Ids';
}

export class LoadFavoritos {
  static readonly type = '[Favoritos] Load Favoritos';
  constructor(public coordenadas?: { lat: number; lng: number }) {}
}

export class ToggleFavorito {
  static readonly type = '[Favoritos] Toggle Favorito';
  constructor(public id_sala: number) {}
}

export class ClearFavoritos {
  static readonly type = '[Favoritos] Clear Favoritos';
}

@State<FavoritosStateModel>({
  name: 'favoritos',
  defaults: {
    ids: [],
    favoritos: [],
    loaded: false,
    loading: false,
    toggleRequestCounter: 0,
    pendingToggles: {}
  }
})
@Injectable()
export class FavoritosState implements NgxsOnInit {

  constructor(private favoritosService: FavoritosService) {}

  async ngxsOnInit(ctx: StateContext<FavoritosStateModel>) {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const ids = JSON.parse(value);
        ctx.patchState({ ids });
        console.log('⭐ Favoritos restaurados desde local:', ids);
      }
    } catch (error) {
      console.error('❌ Error cargando favoritos locales:', error);
    }
  }

  private async saveToLocal(ids: number[]): Promise<void> {
    try {
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(ids) });
    } catch (error) {
      console.error('❌ Error guardando favoritos:', error);
    }
  }

  // Selectores
  @Selector()
  static ids(state: FavoritosStateModel): number[] {
    return state.ids;
  }

  @Selector()
  static favoritos(state: FavoritosStateModel): SalaFavorita[] {
    return state.favoritos;
  }

  @Selector()
  static loaded(state: FavoritosStateModel): boolean {
    return state.loaded;
  }

  @Selector()
  static loading(state: FavoritosStateModel): boolean {
    return state.loading;
  }

  @Selector()
  static count(state: FavoritosStateModel): number {
    return state.ids.length;
  }

  /**
   * Selector dinámico para verificar si una sala es favorita
   */
  static isFavorito(id_sala: number) {
    return (state: FavoritosStateModel) => state.ids.includes(id_sala);
  }

  // Acciones

  @Action(LoadFavoritoIds)
  loadFavoritoIds(ctx: StateContext<FavoritosStateModel>) {
    const state = ctx.getState();
    if (state.loading) return undefined;

    ctx.patchState({ loading: true });

    return this.favoritosService.getFavoritoIds().pipe(
      tap({
        next: async (response) => {
          console.log('⭐ IDs desde API:', response.ids);
          
          // Merge con IDs actuales para evitar race condition
          const currentIds = ctx.getState().ids;
          const mergedIds = [...new Set([...currentIds, ...response.ids])];
          
          console.log('⭐ IDs finales (merge):', mergedIds);
          ctx.patchState({
            ids: mergedIds,
            loaded: true,
            loading: false
          });
          await this.saveToLocal(mergedIds);
        },
        error: (error) => {
          console.error('❌ Error cargando IDs:', error);
          ctx.patchState({ loading: false });
        }
      })
    );
  }

  @Action(LoadFavoritos)
  loadFavoritos(ctx: StateContext<FavoritosStateModel>, action: LoadFavoritos) {
    const state = ctx.getState();
    if (state.loading) return undefined;

    ctx.patchState({ loading: true });

    return this.favoritosService.getFavoritos(action.coordenadas).pipe(
      tap({
        next: (response) => {
          console.log('⭐ Favoritos completos cargados:', response.count);
          const ids = response.favoritos.map(f => f.id_sala);
          ctx.patchState({
            favoritos: response.favoritos,
            ids: ids,
            loaded: true,
            loading: false
          });
        },
        error: (error) => {
          console.error('❌ Error cargando favoritos:', error);
          ctx.patchState({ loading: false });
        }
      })
    );
  }

  @Action(ToggleFavorito)
  toggleFavorito(ctx: StateContext<FavoritosStateModel>, action: ToggleFavorito) {
    const state = ctx.getState();
    const isFavorito = state.ids.includes(action.id_sala);
    const idsBackup = [...state.ids];
    const favoritosBackup = [...state.favoritos];

    // Identificador de esta petición para poder ignorar respuestas antiguas
    const requestId = state.toggleRequestCounter + 1;
    ctx.patchState({
      toggleRequestCounter: requestId,
      pendingToggles: { ...state.pendingToggles, [action.id_sala]: requestId }
    });

    // Optimista
    if (isFavorito) {
      ctx.patchState({
        ids: state.ids.filter(id => id !== action.id_sala),
        favoritos: state.favoritos.filter(f => f.id_sala !== action.id_sala)
      });
    } else {
      ctx.patchState({
        ids: [...state.ids, action.id_sala]
      });
    }
    this.saveToLocal(ctx.getState().ids);

    return this.favoritosService.toggleFavorito(action.id_sala).pipe(
      tap({
        next: async (response) => {
          const latest = ctx.getState().pendingToggles[action.id_sala];
          if (latest !== requestId) {
            // Respuesta vieja (hubo otro toggle después). No tocar el estado.
            return;
          }

          console.log('✅ Toggle confirmado por API');
          const newIds = response.isFavorite
            ? (ctx.getState().ids.includes(action.id_sala) ? ctx.getState().ids : [...ctx.getState().ids, action.id_sala])
            : ctx.getState().ids.filter(id => id !== action.id_sala);
          
          const newFavoritos = response.isFavorite
            ? ctx.getState().favoritos
            : ctx.getState().favoritos.filter(f => f.id_sala !== action.id_sala);

          const { [action.id_sala]: _removed, ...restPending } = ctx.getState().pendingToggles;
          ctx.patchState({ ids: newIds, favoritos: newFavoritos, pendingToggles: restPending });
          await this.saveToLocal(newIds);
        },
        error: async (error) => {
          const latest = ctx.getState().pendingToggles[action.id_sala];
          if (latest !== requestId) {
            return;
          }

          console.error('❌ Error toggle, revirtiendo');
          const { [action.id_sala]: _removed, ...restPending } = ctx.getState().pendingToggles;
          ctx.patchState({ ids: idsBackup, favoritos: favoritosBackup, pendingToggles: restPending });
          await this.saveToLocal(idsBackup);
        }
      })
    );
  }

  @Action(ClearFavoritos)
  async clearFavoritos(ctx: StateContext<FavoritosStateModel>) {
    ctx.setState({
      ids: [],
      favoritos: [],
      loaded: false,
      loading: false,
      toggleRequestCounter: 0,
      pendingToggles: {}
    });
    await this.saveToLocal([]);
  }
}
