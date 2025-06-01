import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { SalaService } from 'src/app/services/sala.service';
import { Sala } from 'src/app/models/sala.model';
import { map, tap } from 'rxjs/operators';

export class GetSalas {
  static readonly type = '[Sala] Get';
  constructor(public filtros?: any) {}
}

export class AppendSalas {
  static readonly type = '[Sala] Append';
  constructor(public filtros?: any) {}
}

export class UpdateSala {
  static readonly type = '[Sala] Update';
  constructor(public sala: Sala) {}
}

export interface SalaStateModel {
  salas: Sala[];
  cantidad: number;
}

@State<SalaStateModel>({
  name: 'sala',
  defaults: {
    salas: [],
    cantidad: 30
  }
})
@Injectable()
export class SalaState {
  constructor(private salaService: SalaService) {}

  @Selector()
  static salas(state: SalaStateModel) {
    return state.salas;
  }

  // 🔄 Acción normal: sobrescribe salas
@Action(GetSalas)
getSalas({ patchState }: StateContext<SalaStateModel>, { filtros }: GetSalas) {
  return this.salaService.getSalas(filtros).pipe(
    tap((salas) => {
      console.log('📥 GetSalas recibió del servicio:', salas.length);
      patchState({ salas });
    }),
    map((salas) => {
      console.log('📤 Devolviendo desde GetSalas a componente:', salas.length);
      return { salas };
    })
  );
}

  // ➕ Acción nueva: añade salas al final (scroll infinito)
@Action(AppendSalas)
appendSalas({ getState, patchState }: StateContext<SalaStateModel>, { filtros }: AppendSalas) {
  return this.salaService.getSalas(filtros).pipe(
    tap((salas) => {
      const state = getState();
      patchState({ salas: [...state.salas, ...salas], cantidad: salas.length  });
    }),
    map((salas) => {
      return { cantidad: getState().cantidad};
    })
  );
}

/*@Action(AppendSalas)
appendSalas({ getState, patchState }: StateContext<SalaStateModel>, { filtros }: AppendSalas) {
  return this.salaService.getSalas(filtros).pipe(
    tap((salas) => {
      console.log('📦 AppendSalas recibió del servicio:', salas.length);
      const state = getState();
      patchState({ salas: [...state.salas, ...salas] });
    }),
    map((salas) => {
      console.log('🧪 Devueltas al componente:', salas.map(s => s.id_sala));
      return {
       // nuevas: salas,
        cantidad: salas.length
      };
    })
  );
}*/

  // 🔧 Actualiza una sala concreta (por WebSocket)
  @Action(UpdateSala)
  updateSala({ getState, patchState }: StateContext<SalaStateModel>, { sala }: UpdateSala) {
    const state = getState();
    const nuevas = state.salas.map(s => s.id_sala === sala.id_sala ? sala : s);
    patchState({ salas: nuevas });
  }
}
