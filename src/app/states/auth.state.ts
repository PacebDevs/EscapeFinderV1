// src/app/states/auth.state.ts
import { State, Action, StateContext, Selector, NgxsOnInit } from '@ngxs/store';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'escape_auth_state';

// Interfaz del usuario (duplicada aquí para evitar dependencia circular)
export interface AuthUser {
  id_usuario: number;
  email: string;
  nombre: string;
  apellidos: string;
  tipo: string;
  estado: string;
  id_empresa: number | null;
  email_verificado?: boolean;
}

// Modelo del estado de autenticación (ahora incluye ubicación)
export interface AuthStateModel {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  // Ubicación del usuario (antes en UsuarioState)
  direccion: string | null;
  ciudad: string | null;
  lat: number | null;
  lng: number | null;
  direccionCompacta: string | null;
}

// Acciones
export class SetAuthData {
  static readonly type = '[Auth] Set Auth Data';
  constructor(public payload: { token: string | null; user: AuthUser }) {}
}

export class ClearAuthData {
  static readonly type = '[Auth] Clear Auth Data';
}

export class UpdateAuthUser {
  static readonly type = '[Auth] Update User';
  constructor(public payload: AuthUser) {}
}

export class SetUbicacion {
  static readonly type = '[Auth] Set Ubicacion';
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

export class ClearUbicacion {
  static readonly type = '[Auth] Clear Ubicacion';
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    token: null,
    user: null,
    isAuthenticated: false,
    direccion: null,
    ciudad: null,
    lat: null,
    lng: null,
    direccionCompacta: null
  }
})
export class AuthState implements NgxsOnInit {

  async ngxsOnInit(ctx: StateContext<AuthStateModel>) {
    // Cargar estado desde Preferences al iniciar
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      
      if (value) {
        const parsed = JSON.parse(value);
        console.log('🔐 AuthState - Restaurando desde Preferences:', {
          hasToken: !!parsed.token,
          email: parsed.user?.email,
          ciudad: parsed.ciudad
        });
        ctx.setState(parsed);
      } else {
        console.log('🔐 AuthState - Inicializado sin datos previos');
      }
    } catch (error) {
      console.error('❌ Error cargando estado:', error);
    }
  }

  /**
   * Guarda el estado actual en Preferences
   */
  private async saveState(state: AuthStateModel): Promise<void> {
    try {
      await Preferences.set({ 
        key: STORAGE_KEY, 
        value: JSON.stringify(state) 
      });
      console.log('💾 Estado guardado en Preferences');
    } catch (error) {
      console.error('❌ Error guardando estado:', error);
    }
  }

  @Selector()
  static token(state: AuthStateModel): string | null {
    return state.token;
  }

  @Selector()
  static user(state: AuthStateModel): AuthUser | null {
    return state.user;
  }

  @Selector()
  static isAuthenticated(state: AuthStateModel): boolean {
    return state.isAuthenticated;
  }

  @Selector()
  static ubicacion(state: AuthStateModel) {
    return {
      direccion: state.direccion,
      ciudad: state.ciudad,
      lat: state.lat,
      lng: state.lng,
      direccionCompacta: state.direccionCompacta
    };
  }

  @Action(SetAuthData)
  async setAuthData(ctx: StateContext<AuthStateModel>, action: SetAuthData) {
    console.log('🔐 SetAuthData:', action.payload.user?.email);
    ctx.patchState({
      token: action.payload.token,
      user: action.payload.user,
      isAuthenticated: true
    });
    await this.saveState(ctx.getState());
  }

  @Action(ClearAuthData)
  async clearAuthData(ctx: StateContext<AuthStateModel>) {
    console.log('🔐 ClearAuthData - Cerrando sesión y limpiando ubicación');
    const newState = {
      token: null,
      user: null,
      isAuthenticated: false,
      direccion: null,
      ciudad: null,
      lat: null,
      lng: null,
      direccionCompacta: null
    };
    ctx.setState(newState);
    await this.saveState(newState);
  }

  @Action(UpdateAuthUser)
  async updateUser(ctx: StateContext<AuthStateModel>, action: UpdateAuthUser) {
    console.log('🔐 UpdateAuthUser:', action.payload?.email);
    ctx.patchState({
      user: action.payload
    });
    await this.saveState(ctx.getState());
  }

  @Action(SetUbicacion)
  async setUbicacion(ctx: StateContext<AuthStateModel>, action: SetUbicacion) {
    console.log('📍 SetUbicacion:', action.payload.ciudad);
    ctx.patchState({
      direccion: action.payload.direccion,
      ciudad: action.payload.ciudad,
      lat: action.payload.lat,
      lng: action.payload.lng,
      direccionCompacta: action.payload.direccionCompacta ?? null
    });
    await this.saveState(ctx.getState());
  }

  @Action(ClearUbicacion)
  async clearUbicacion(ctx: StateContext<AuthStateModel>) {
    console.log('🗑️ ClearUbicacion');
    ctx.patchState({
      direccion: null,
      ciudad: null,
      lat: null,
      lng: null,
      direccionCompacta: null
    });
    await this.saveState(ctx.getState());
  }
}
