import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email = '';
  password = '';
  showPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  /**
   * Maneja el submit del formulario
   */
  async onLogin() {
    // Validación básica
    if (!this.email || !this.password) {
      this.showAlert('Error', 'Por favor completa todos los campos');
      return;
    }

    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent'
    });
    await loading.present();

    // Llamar al servicio de autenticación
    this.authService.login(this.email, this.password).subscribe({
      next: async (response) => {
        await loading.dismiss();
        console.log('✅ Login exitoso, navegando a tabs');
        this.router.navigate(['/tabs/tab1']);
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('❌ Error en login:', error);
        
        const mensaje = error.error?.error || 'Error al iniciar sesión';
        this.showAlert('Error', mensaje);
      }
    });
  }

  /**
   * Navega a la página de registro
   */
  goToRegister() {
    this.router.navigate(['/register']);
  }

  /**
   * Navega a la página de recuperar contraseña
   */
  goToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  /**
   * Toggle para mostrar/ocultar contraseña
   */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Login con Google
   */
  async loginWithGoogle() {
    const loading = await this.loadingController.create({
      message: 'Autenticando con Google...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.loginWithGoogle();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error en Google login:', error);
      
      // Si el usuario canceló, no mostramos error
      if (error?.error === 'popup_closed_by_user' || error?.error === 'POPUP_CLOSED') {
        return;
      }
      
      const mensaje = error?.message || error?.error?.error || 'Error al iniciar sesión con Google';
      this.showAlert('Error', mensaje);
    }
  }

  /**
   * Login con Apple
   */
  async loginWithApple() {
    const loading = await this.loadingController.create({
      message: 'Autenticando con Apple...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.loginWithApple();
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error en Apple login:', error);
      
      // Si el usuario canceló, no mostramos error
      if (error?.error === '1001') {
        return;
      }
      
      const mensaje = error?.message || error?.error?.error || 'Error al iniciar sesión con Apple';
      this.showAlert('Error', mensaje);
    }
  }

  /**
   * Muestra un alert con mensaje
   */
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }
}
