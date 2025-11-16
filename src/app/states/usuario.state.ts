// src/app/states/usuario/usuario.state.ts
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { UsuarioStateModel } from '../models/usuario.model';

export class SetUbicacionUsuario {
  static readonly type = '[Usuario] Set Ubicacion';
  constructor(
    public payload: {
      direccion: string;
      ciudad: string;
      lat: number;
      lng: number;
      direccionCompacta?: string | null;
    }
  ) {}
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
    lng: null,
    direccionCompacta: null
  }
})
export class UsuarioState {
  @Selector()
  static ubicacion(state: UsuarioStateModel) {
    return {
      direccion: state.direccion,
      ciudad: state.ciudad,
      lat: state.lat,
      lng: state.lng,
      direccionCompacta: state.direccionCompacta
    };
  }

  @Action(SetUbicacionUsuario)
  setUbicacion(ctx: StateContext<UsuarioStateModel>, action: SetUbicacionUsuario) {
    ctx.patchState({
      direccion: action.payload.direccion,
      ciudad: action.payload.ciudad,
      lat: action.payload.lat,
      lng: action.payload.lng,
      direccionCompacta: action.payload.direccionCompacta ?? null
    });
  }

  @Action(ClearUbicacionUsuario)
  clearUbicacion(ctx: StateContext<UsuarioStateModel>) {
    ctx.setState({
      direccion: null,
      ciudad: null,
      lat: null,
      lng: null,
      direccionCompacta: null
    });
  }

}