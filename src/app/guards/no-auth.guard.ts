import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Guard inverso al AuthGuard.
 * Protege las rutas de login/register para usuarios YA autenticados.
 * Si el usuario ya está logueado, lo redirige a /tabs.
 */
@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const isAuth = this.authService.isAuthenticated();
    
    console.log('🛡️ NoAuthGuard - Usuario autenticado:', isAuth);

    if (isAuth) {
      // Usuario ya logueado, redirigir a tabs
      console.log('✅ Ya autenticado - Redirigiendo a /tabs');
      return this.router.createUrlTree(['/tabs']);
    }

    // No autenticado, puede ver login/register
    return true;
  }
}
