// src/app/states/usuario/usuario.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { UsuarioStateModel } from '../models/usuario.model';

export class SetUbicacionUsuario {
  static readonly type = '[Usuario] Set Ubicacion';
  constructor(public payload: { direccion: string, ciudad: string, lat: number, lng: number }) {}
}

export class ClearUbicacionUsuario {
  static readonly type = '[Usuario] Clear Ubicacion';
}



@State<UsuarioStateModel>({
  name: 'usuario',
  defaults: {
    direccion: null,
    ciudad: null,
    lat: null,
    lng: null
  }
})
export class UsuarioState {
  @Selector()
  static ubicacion(state: UsuarioStateModel) {
    return {
      direccion: state.direccion,
      ciudad: state.ciudad,
      lat: state.lat,
      lng: state.lng
    };
  }

  @Action(SetUbicacionUsuario)
  setUbicacion(ctx: StateContext<UsuarioStateModel>, action: SetUbicacionUsuario) {
    ctx.patchState({
      ...action.payload
    });
  }

  @Action(ClearUbicacionUsuario)
  clearUbicacion(ctx: StateContext<UsuarioStateModel>) {
    ctx.setState({
      direccion: null,
      ciudad: null,
      lat: null,
      lng: null
    });
  }

}