import { Component, OnInit } from '@angular/core';
import { AuthService, Usuario } from '../services/auth.service';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AvatarSelectorComponent } from '../components/avatar-selector/avatar-selector.component';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  user: Usuario | null = null;
  isEditing = false;

  // Datos editables
  nombre: string = '';
  apellidos: string = '';

  constructor(
    private authService: AuthService,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    // Cargar datos del usuario actual
    this.loadUserData();
  }

  ionViewWillEnter() {
    // Recargar datos cada vez que se muestra la página
    this.loadUserData();
  }

  loadUserData() {
    this.user = this.authService.getCurrentUser();
    if (this.user) {
      this.nombre = this.user.nombre || '';
      this.apellidos = this.user.apellidos || '';
    }
  }

  getAvatarPath(): string | null {
    if (this.user?.avatar_url && this.user.avatar_url !== 'SIN_AVATAR') {
      return `assets/avatars/${this.user.avatar_url}.png`;
    }
    return null;
  }

  async openAvatarSelector() {
    const modal = await this.modalController.create({
      component: AvatarSelectorComponent,
      componentProps: {
        currentAvatar: this.user?.avatar_url,
        isRequired: false
      },
      cssClass: 'avatar-selector-modal'
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data) {
      await this.updateAvatar(data);
    }
  }

  async updateAvatar(avatarId: string) {
    const loading = await this.loadingController.create({
      message: 'Actualizando avatar...'
    });
    await loading.present();

    try {
      await firstValueFrom(
        this.authService.updateAvatar(avatarId)
      );
      
      await loading.dismiss();
      await this.showToast('Avatar actualizado correctamente', 'success');
      this.loadUserData();
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error actualizando avatar:', error);
      await this.showToast(
        error.error?.error || 'Error al actualizar el avatar',
        'danger'
      );
    }
  }

  toggleEdit() {
    if (this.isEditing) {
      // Cancelar edición - restaurar valores originales
      this.loadUserData();
    }
    this.isEditing = !this.isEditing;
  }

  async saveProfile() {
    if (!this.nombre.trim()) {
      await this.showToast('El nombre no puede estar vacío', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando cambios...',
    });
    await loading.present();

    try {
      await firstValueFrom(
        this.authService.updateProfile(this.nombre.trim(), this.apellidos.trim())
      );
      
      await loading.dismiss();
      await this.showToast('Perfil actualizado correctamente', 'success');
      this.isEditing = false;
      this.loadUserData();
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error actualizando perfil:', error);
      await this.showToast(
        error.error?.error || 'Error al actualizar el perfil',
        'danger'
      );
    }
  }

  async requestPasswordReset() {
    const alert = await this.alertController.create({
      header: 'Resetear Contraseña',
      message: `Se enviará un correo electrónico a ${this.user?.email} con instrucciones para restablecer tu contraseña.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Enviando correo...',
            });
            await loading.present();

            try {
              await firstValueFrom(this.authService.requestPasswordReset());
              await loading.dismiss();
              await this.showToast(
                'Correo de recuperación enviado. Revisa tu bandeja de entrada.',
                'success'
              );
            } catch (error: any) {
              await loading.dismiss();
              console.error('Error solicitando reset:', error);
              await this.showToast(
                error.error?.error || 'Error al enviar el correo',
                'danger'
              );
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Eliminar Cuenta',
      message: '⚠️ Esta acción es permanente. ¿Estás seguro de que quieres eliminar tu cuenta?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            // Confirmación adicional
            const confirmAlert = await this.alertController.create({
              header: '¿Estás completamente seguro?',
              message: 'Esta acción no se puede deshacer.',
              buttons: [
                {
                  text: 'No, cancelar',
                  role: 'cancel'
                },
                {
                  text: 'Sí, eliminar',
                  cssClass: 'danger',
                  handler: async () => {
                    const loading = await this.loadingController.create({
                      message: 'Eliminando cuenta...',
                    });
                    await loading.present();

                    try {
                      await firstValueFrom(this.authService.deleteAccount());
                      await loading.dismiss();
                      // El servicio ya redirige al login
                    } catch (error: any) {
                      await loading.dismiss();
                      console.error('Error eliminando cuenta:', error);
                      await this.showToast(
                        error.error?.error || 'Error al eliminar la cuenta',
                        'danger'
                      );
                    }
                  }
                }
              ]
            });
            await confirmAlert.present();
          }
        }
      ]
    });

    await alert.present();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}
