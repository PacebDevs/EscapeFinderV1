import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage {
  email = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  async onSubmit() {
    if (!this.email) {
      this.showAlert('Error', 'Por favor ingresa tu email');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando email...',
      spinner: 'crescent'
    });
    await loading.present();

    this.authService.forgotPassword(this.email).subscribe({
      next: async (response) => {
        await loading.dismiss();
        await this.showAlert(
          'Email enviado',
          response.mensaje || 'Revisa tu bandeja de entrada y spam.'
        );
        this.router.navigate(['/login']);
      },
      error: async (error) => {
        await loading.dismiss();
        const mensaje = error.error?.error || 'Error al enviar email';
        this.showAlert('Error', mensaje);
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
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
