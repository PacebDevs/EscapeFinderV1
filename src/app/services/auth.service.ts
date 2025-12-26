import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface Usuario {
  id_usuario: number;
  email: string;
  nombre: string;
  apellidos: string;
  tipo: string;
  estado: string;
  id_empresa: number | null;
  email_verificado?: boolean;
}

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
  private readonly TOKEN_KEY = 'escape_auth_token';
  private readonly USER_KEY = 'escape_auth_user';

  // BehaviorSubject: Observable que mantiene el último valor emitido
  // Útil para compartir el estado del usuario entre componentes
  private currentUserSubject = new BehaviorSubject<Usuario | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    console.log('🔐 AuthService initialized');
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
   * Cierra sesión y limpia el localStorage
   */
  logout() {
    console.log('👋 Cerrando sesión');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token JWT del localStorage
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): Usuario | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  /**
   * Guarda el token y usuario en localStorage
   * y actualiza los observables
   */
  private saveAuthData(response: AuthResponse) {
    if (response.token) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Lee el usuario del localStorage al iniciar
   */
  private getUserFromStorage(): Usuario | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Verifica si existe un token
   */
  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  // Métodos preparados para login social (implementar después)
  async loginWithGoogle(): Promise<void> {
    console.log('🔜 Google login - Por implementar');
    throw new Error('Google login no implementado aún');
  }

  async loginWithApple(): Promise<void> {
    console.log('🔜 Apple login - Por implementar');
    throw new Error('Apple login no implementado aún');
  }
}