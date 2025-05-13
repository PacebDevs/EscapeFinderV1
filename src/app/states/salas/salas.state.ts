import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { SalaService } from 'src/app/services/sala.service';
import { Sala } from 'src/app/models/sala.model';

export class GetSalas {
  static readonly type = '[Sala] Get';
  constructor(public filtros?: any) {}
}

// Nueva acción para actualizar una sala concreta
export class UpdateSala {
  static readonly type = '[Sala] Update';
  constructor(public sala: Sala) {}
}

export interface SalaStateModel {
  salas: Sala[];
}

@State<SalaStateModel>({
  name: 'sala',
  defaults: {
    salas: [],
  }
})
@Injectable()
export class SalaState {
  constructor(private salaService: SalaService) {}

  @Selector()
  static salas(state: SalaStateModel) {
    return state.salas;
  }

  @Action(GetSalas)
  getSalas(
    { patchState }: StateContext<SalaStateModel>,
    { filtros }: GetSalas
  ) {
    console.log('Entra en GetSalas');
    return this.salaService.getSalas(filtros).subscribe((salas) => {
      patchState({ salas });
    });
  }

  // Handler para la acción UpdateSala
  @Action(UpdateSala)
  updateSala(
    { getState, patchState }: StateContext<SalaStateModel>,
    { sala }: UpdateSala
  ) {
    const state = getState();
    const nuevas = state.salas.map(s =>
      s.id_sala === sala.id_sala ? sala : s
    );
    patchState({ salas: nuevas });
  }
}
