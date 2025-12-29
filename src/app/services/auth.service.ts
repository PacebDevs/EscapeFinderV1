import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple, SignInWithAppleOptions, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { Store, Select } from '@ngxs/store';
import { AuthState, SetAuthData, ClearAuthData, UpdateAuthUser, AuthUser } from '../states/auth.state';

// Re-exportar para compatibilidad
export type Usuario = AuthUser;

export interface AuthResponse {
  user: Usuario;
  token?: string;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;

  // Selectores NGXS - Se suscriben automáticamente al estado persistido
  @Select(AuthState.user) currentUser$!: Observable<Usuario | null>;
  @Select(AuthState.isAuthenticated) isAuthenticated$!: Observable<boolean>;
  @Select(AuthState.token) token$!: Observable<string | null>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private store: Store
  ) {
    console.log('🔐 AuthService initialized');
    
    // Inicializar Google Auth en plataformas nativas
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }

    // Log del estado inicial (ya cargado por NGXS Storage Plugin)
    const isAuth = this.store.selectSnapshot(AuthState.isAuthenticated);
    const user = this.store.selectSnapshot(AuthState.user);
    console.log('🔐 Estado inicial desde NGXS:', { isAuthenticated: isAuth, email: user?.email });
  }

  /**
   * Registra un nuevo usuario
   * @returns Observable con la respuesta del servidor
   */
  register(email: string, password: string, nombre?: string, apellidos?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, {
      email,
      password,
      nombre,
      apellidos
    }).pipe(
      tap(response => {
        console.log('📝 Registro exitoso:', response);
        // Si devuelve token, guardamos (modo desarrollo sin verificación)
        if (response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  /**
   * Inicia sesión
   * @returns Observable con la respuesta del servidor
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        console.log('✅ Login exitoso:', response.user.email);
        this.saveAuthData(response);
      })
    );
  }

  /**
   * Verifica el email con el token recibido por correo
   */
  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/verify-email`, {
      params: { token }
    }).pipe(
      tap(response => {
        console.log('✅ Email verificado:', response);
        if (response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  /**
   * Cierra sesión y limpia el store NGXS
   */
  logout() {
    console.log('👋 Cerrando sesión');
    this.store.dispatch(new ClearAuthData());
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token JWT desde el store NGXS
   */
  getToken(): string | null {
    return this.store.selectSnapshot(AuthState.token);
  }

  /**
   * Obtiene el usuario actual desde el store NGXS
   */
  getCurrentUser(): Usuario | null {
    return this.store.selectSnapshot(AuthState.user);
  }

  /**
   * Verifica si el usuario está autenticado (desde NGXS)
   */
  isAuthenticated(): boolean {
    return this.store.selectSnapshot(AuthState.isAuthenticated);
  }

  /**
   * Guarda el token y usuario en el store NGXS
   * NgxsStoragePluginModule lo persiste automáticamente en localStorage
   */
  private saveAuthData(response: AuthResponse): void {
    console.log('💾 Guardando sesión en NGXS Store:', response.user.email);
    this.store.dispatch(new SetAuthData({
      token: response.token || null,
      user: response.user
    }));
  }

  /**
   * Actualiza los datos del usuario en el store
   */
  updateCurrentUser(user: Usuario): void {
    this.store.dispatch(new UpdateAuthUser(user));
  }

  /**
   * Solicitar recuperación de contraseña
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/forgot-password`, { email }).pipe(
      tap(response => console.log('📧 Email de recuperación enviado'))
    );
  }

  /**
   * Resetear contraseña con token
   */
  resetPassword(token: string, newPassword: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/reset-password`, {
      token,
      newPassword
    }).pipe(
      tap(response => {
        console.log('✅ Contraseña actualizada');
        if (response.token) {
          this.saveAuthData(response);
        }
      })
    );
  }

  // Métodos preparados para login social (implementar después)
  async loginWithGoogle(): Promise<void> {
    try {
      console.log('🔵 Iniciando login con Google...');
      
      // Obtener token de Google
      const googleUser = await GoogleAuth.signIn();
      console.log('✅ Usuario autenticado con Google:', googleUser.email);
      
      if (!googleUser.authentication?.idToken) {
        throw new Error('No se recibió ID token de Google');
      }

      // Enviar token al backend para verificar y crear/vincular usuario
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/google`, {
          idToken: googleUser.authentication.idToken
        })
      );

      console.log('✅ Login con Google exitoso:', response.user.email);
      this.saveAuthData(response);
      await this.router.navigate(['/tabs/tab1']);
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error);
      // Si el usuario canceló, no mostramos error
      if (error.error !== 'popup_closed_by_user' && error.error !== 'POPUP_CLOSED') {
        throw error;
      }
    }
  }

  async loginWithApple(): Promise<void> {
    try {
      console.log('🍎 Iniciando login con Apple...');

      const options: SignInWithAppleOptions = {
        clientId: 'io.ionic.starter', // Debe coincidir con tu appId
        redirectURI: 'https://escapefinder.com/auth/apple', // URL configurada en Apple Developer
        scopes: 'email name',
        state: '12345',
        nonce: 'nonce'
      };

      const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);
      console.log('✅ Usuario autenticado con Apple');

      if (!result.response?.identityToken) {
        throw new Error('No se recibió identity token de Apple');
      }

      // Enviar token al backend
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_URL}/auth/apple`, {
          identityToken: result.response.identityToken,
          user: result.response.user // Solo disponible en primer login
        })
      );

      console.log('✅ Login con Apple exitoso:', response.user.email);
      this.saveAuthData(response);
      await this.router.navigate(['/tabs/tab1']);
    } catch (error: any) {
      console.error('❌ Error en login con Apple:', error);
      // Si el usuario canceló, no mostramos error
      if (error.error !== '1001') { // Código de cancelación de Apple
        throw error;
      }
    }
  }
}