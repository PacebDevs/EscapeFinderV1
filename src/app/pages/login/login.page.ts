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
   * Login con Google (placeholder)
   */
  async loginWithGoogle() {
    try {
      await this.authService.loginWithGoogle();
    } catch (error) {
      this.showAlert('Próximamente', 'Login con Google estará disponible pronto');
    }
  }

  /**
   * Login con Apple (placeholder)
   */
  async loginWithApple() {
    try {
      await this.authService.loginWithApple();
    } catch (error) {
      this.showAlert('Próximamente', 'Login con Apple estará disponible pronto');
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
