import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    // Obtener token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      if (!this.token) {
        this.showAlert('Error', 'Enlace de recuperación inválido');
        this.router.navigate(['/login']);
      }
    });
  }

  async onSubmit() {
    if (!this.newPassword || !this.confirmPassword) {
      this.showAlert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.showAlert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (this.newPassword.length < 8) {
      this.showAlert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Actualizando contraseña...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.showAlert(
          'Contraseña actualizada',
          'Tu contraseña ha sido actualizada correctamente'
        );
        // Login automático y navegar a tabs
        this.router.navigate(['/tabs/tab1']);
      },
      error: async (error) => {
        await loading.dismiss();
        const mensaje = error.error?.error || 'Error al actualizar contraseña';
        this.showAlert('Error', mensaje);
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
