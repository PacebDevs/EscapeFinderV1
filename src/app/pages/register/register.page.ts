import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  // Datos del formulario
  email = '';
  password = '';
  confirmPassword = '';
  nombre = '';
  apellidos = '';
  
  // Estado de visibilidad de contraseñas
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  /**
   * Maneja el submit del formulario de registro
   */
  async onRegister() {
    // Validación de campos obligatorios
    if (!this.email || !this.password || !this.confirmPassword) {
      this.showAlert('Error', 'Por favor completa los campos obligatorios (email y contraseñas)');
      return;
    }

    // Validar que las contraseñas coincidan
    if (this.password !== this.confirmPassword) {
      this.showAlert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Validar longitud mínima de contraseña
    if (this.password.length < 8) {
      this.showAlert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.showAlert('Error', 'Por favor ingresa un email válido');
      return;
    }

    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Creando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    // Llamar al servicio de registro
    this.authService.register(this.email, this.password, this.nombre, this.apellidos).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        console.log('✅ Registro exitoso:', response);
        
        // Si devuelve mensaje, requiere verificación de email
        if (response.mensaje) {
          await this.showAlert(
            'Registro exitoso', 
            response.mensaje + '\n\nRevisa tu bandeja de entrada y spam.'
          );
          this.router.navigate(['/login']);
        } else {
          // Login automático (modo desarrollo)
          console.log('🚀 Navegando a tabs (login automático)');
          this.router.navigate(['/tabs/tab1']);
        }
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('❌ Error en registro:', error);
        
        // Mostrar mensaje de error del servidor
        const mensaje = error.error?.error || 'Error al registrar usuario. Intenta nuevamente.';
        this.showAlert('Error', mensaje);
      }
    });
  }

  /**
   * Navega a la página de login
   */
  goToLogin() {
    this.router.navigate(['/login']);
  }

  /**
   * Toggle para mostrar/ocultar contraseña
   */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Toggle para mostrar/ocultar confirmación de contraseña
   */
  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
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
