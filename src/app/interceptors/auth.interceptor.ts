import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Intercepta cada petición HTTP
   * - Añade el token JWT si existe
   * - Maneja errores 401 (no autenticado)
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    // Si hay token, clonamos la request y añadimos el header Authorization
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('🔑 Token añadido a la petición');
    }

    // Continuamos con la petición y manejamos errores
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el servidor responde 401, el token es inválido o expiró
        if (error.status === 401) {
          console.log('❌ Token inválido/expirado - Cerrando sesión');
          this.authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
}