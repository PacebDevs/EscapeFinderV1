import { Component, NgZone } from '@angular/core';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Router } from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  constructor(
    private router: Router,
    private zone: NgZone
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await EdgeToEdge.enable();
    await EdgeToEdge.setBackgroundColor({ color: '#ffffff' });
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    
    // Configurar listener para deep links
    this.setupDeepLinks();
  }

  ngOnInit() {
    try {
      if (Capacitor.isNativePlatform()) {
        // setResizeMode puede no existir en versiones antiguas; usar optional chaining
        (Keyboard as any).setResizeMode?.({ mode: 'ionic' });
      }
    } catch {}
  }

  private setupDeepLinks() {
    CapacitorApp.addListener('appUrlOpen', (data: any) => {
      this.zone.run(() => {
        console.log('🔗 Deep link recibido:', data.url);
        
        try {
          // Extraer la parte después de escapefinder://
          const urlString = data.url;
          
          // Manejar URLs de esquema custom
          if (urlString.startsWith('escapefinder://')) {
            const path = urlString.replace('escapefinder://', '');
            console.log('📍 Path extraído:', path);
            
            // Redirigir a login cuando se abre la app desde web
            if (path === 'login' || path === '' || path === '/') {
              console.log('🔑 Navegando a login');
              this.router.navigate(['/login'], { replaceUrl: true });
            }
            else {
              console.log('🏠 Navegando a:', path);
              this.router.navigate(['/' + path], { replaceUrl: true });
            }
          } else {
            console.warn('⚠️ Deep link no reconocido:', data.url);
          }
        } catch (error) {
          console.error('❌ Error procesando deep link:', error);
        }
      });
    });
    
    console.log('✅ Deep links configurados');
  }
}
