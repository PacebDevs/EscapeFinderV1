import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-avatar-selector',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './avatar-selector.component.html',
  styleUrls: ['./avatar-selector.component.scss']
})
export class AvatarSelectorComponent {
  @Input() currentAvatar: string | null = null;
  @Input() isRequired: boolean = false; // Para el primer login

  avatares = [
    { id: 'candado', path: 'assets/avatars/candado.png' },
    { id: 'exploradora', path: 'assets/avatars/exploradora.png' },
     { id: 'inspector', path: 'assets/avatars/inspector.png' },
    { id: 'hacker', path: 'assets/avatars/hacker.png' },
    { id: 'ojo', path: 'assets/avatars/ojo.png' },
    { id: 'reloj', path: 'assets/avatars/reloj.png' }
  ];

  selectedAvatar: string | null = null;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.selectedAvatar = this.currentAvatar;
  }

  selectAvatar(avatarId: string) {
    this.selectedAvatar = avatarId;
  }

  getAvatarPath(avatarId: string): string {
    return `assets/avatars/${avatarId}.png`;
  }

  dismiss() {
    // Solo permitir cerrar si no es obligatorio o si ya seleccionó uno
    if (!this.isRequired || this.selectedAvatar) {
      this.modalController.dismiss(null);
    }
  }

  confirm() {
    if (this.selectedAvatar) {
      this.modalController.dismiss(this.selectedAvatar);
    }
  }

  skipAvatar() {
    // Guardar 'SIN_AVATAR' para indicar que el usuario decidió no elegir
    this.modalController.dismiss('SIN_AVATAR');
  }
}
