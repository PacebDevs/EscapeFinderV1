import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { SalaService } from 'src/app/services/sala.service';
import { Sala } from 'src/app/models/sala.model';


export class GetSalas {
  static readonly type = '[Sala] Get';
  constructor(public filtros?: any) {}
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
  getSalas({ patchState }: StateContext<SalaStateModel>, { filtros }: GetSalas) {
    console.log("Entra")
    return this.salaService.getSalas(filtros).subscribe((salas) => {
      patchState({ salas });
    });
  }
}
