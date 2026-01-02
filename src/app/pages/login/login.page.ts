import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { AvatarSelectorComponent } from '../../components/avatar-selector/avatar-selector.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  showPassword = false;

  // Disponibilidad de métodos OAuth según plataforma
  showGoogleLogin = false;
  showAppleLogin = false;
  showSocialLogin = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.detectPlatform();
  }

  /**
   * Detecta la plataforma y habilita métodos OAuth disponibles
   */
  private detectPlatform() {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'android') {
      this.showGoogleLogin = true;
      this.showAppleLogin = false; // Apple Sign-In no disponible en Android
    } else if (platform === 'ios') {
      this.showGoogleLogin = true;
      this.showAppleLogin = true; // Ambos disponibles en iOS
    } else {
      // Web: OAuth no funciona correctamente, ocultamos ambos
      this.showGoogleLogin = false;
      this.showAppleLogin = false;
    }

    // Mostrar sección social solo si hay al menos un método disponible
    this.showSocialLogin = this.showGoogleLogin || this.showAppleLogin;
  }

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
        console.log('🔍 DEBUG avatar_url:', response.user.avatar_url, 'tipo:', typeof response.user.avatar_url);
        
        // Verificar si es primer login (avatar_url === null)
        if (response.user.avatar_url === null) {
          console.log('🎭 Mostrando modal de selección de avatar (primer login)');
          await this.showAvatarSelector(true);
        } else {
          console.log('✅ Usuario ya tiene avatar:', response.user.avatar_url);
        }
        
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
   * Mostrar modal de selección de avatar
   */
  async showAvatarSelector(isRequired: boolean = false) {
    const modal = await this.modalController.create({
      component: AvatarSelectorComponent,
      componentProps: {
        currentAvatar: null,
        isRequired: isRequired
      },
      cssClass: 'avatar-selector-modal',
      backdropDismiss: !isRequired
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data) {
      try {
        await firstValueFrom(this.authService.updateAvatar(data));
        console.log('✅ Avatar seleccionado:', data);
      } catch (error) {
        console.error('❌ Error guardando avatar:', error);
      }
    }
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
      const response = await this.authService.loginWithGoogle();
      await loading.dismiss();
      
      // Verificar si es primer login (avatar_url === null)
      if (response.user.avatar_url === null) {
        await this.showAvatarSelector(true);
      }
      
      this.router.navigate(['/tabs/tab1']);
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
      const response = await this.authService.loginWithApple();
      await loading.dismiss();
      
      // Verificar si es primer login (avatar_url === null)
      if (response.user.avatar_url === null) {
        await this.showAvatarSelector(true);
      }
      
      this.router.navigate(['/tabs/tab1']);
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
