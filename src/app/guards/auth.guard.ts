import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const isAuth = this.authService.isAuthenticated();
    
    console.log('🛡️ AuthGuard - Autenticado:', isAuth);

    if (isAuth) {
      return true;
    }

    console.log('🚫 No autenticado - Redirigiendo a /login');
    return this.router.createUrlTree(['/login']);
  }
}