import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
   standalone: false
})
export class VerifyEmailPage implements OnInit {
  verifying = true;
  success = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    // Obtener token de los query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.verifyEmail(token);
      } else {
        this.verifying = false;
        this.errorMessage = 'No se proporcionó un token de verificación válido';
      }
    });
  }

  async verifyEmail(token: string) {
    const loading = await this.loadingController.create({
      message: 'Verificando tu email...'
    });
    await loading.present();

    this.authService.verifyEmail(token).subscribe({
      next: async (response) => {
        await loading.dismiss();
        this.verifying = false;
        this.success = true;
        
        // Mostrar mensaje de éxito
        const alert = await this.alertController.create({
          header: '✅ Email verificado',
          message: response.mensaje || 'Tu email ha sido verificado correctamente',
          buttons: [{
            text: 'Iniciar sesión',
            handler: () => {
              this.router.navigate(['/login']);
            }
          }]
        });
        await alert.present();
      },
      error: async (error) => {
        await loading.dismiss();
        this.verifying = false;
        this.success = false;
        this.errorMessage = error.error?.mensaje || 'Error al verificar el email. El token puede haber expirado.';
        
        const alert = await this.alertController.create({
          header: '❌ Error',
          message: this.errorMessage,
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
