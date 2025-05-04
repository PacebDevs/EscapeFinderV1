import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngxs/store';
import { ModalController } from '@ionic/angular';
import { GetSalas, SalaState } from '../states/salas/salas.state';
import { SocketService } from '../services/socket.service';
import { FiltersModalComponent } from '../components/filters-modal/filters-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CATEGORIAS } from '../constants/categorias.const';

@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false
})
export class Tab1Page implements OnInit, OnDestroy {

  categorias = CATEGORIAS;
  salas$ = this.store.select(SalaState.salas);
  filters: any = {};
  subs: any;
  activeCategoria: string = 'Todo'; // 👉 controlamos la categoría activa aquí
  public todasCargadas = false;
  private totalSalas = 0;
  private cargadas = 0;

  constructor(
    private store: Store,
    private socketService: SocketService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.fetchSalas();
    this.socketService.connect();

    this.subs = this.socketService.listenSalasUpdated().subscribe(() => {
      this.fetchSalas();
    });
  }

  ngOnDestroy() {
    this.subs?.unsubscribe();
    this.socketService.disconnect();
  }

  async openFilters() {
    const modal = await this.modalCtrl.create({
      component: FiltersModalComponent,
      componentProps: { filters: this.filters }
    });

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.filters = data;
      this.fetchSalas();
    }
  }

  selectCategoria(nombre: string, el: HTMLElement) {
    if (nombre === 'Todo') {
      delete this.filters.categoria;
    } else {
      this.filters = { ...this.filters, categoria: nombre };
    }
  
    this.activeCategoria = nombre;
  
    Haptics.impact({ style: ImpactStyle.Medium });
  
    // Rebote normal
    el.classList.add('bounce');
    setTimeout(() => el.classList.remove('bounce'), 400);
  
    // 🎯 Nuevo: Centrar la categoría
    this.scrollCategoriaIntoView(el);
  
    this.fetchSalas();
  }
  
  /** 🔥 Nueva función para hacer scroll automático */
private scrollCategoriaIntoView(el: HTMLElement) {
  const scrollContainer = el.parentElement;
  if (!scrollContainer) return;

  const containerWidth = scrollContainer.clientWidth;
  const elLeft = el.offsetLeft;
  const elWidth = el.offsetWidth;

  const scrollTo = elLeft - (containerWidth / 2) + (elWidth / 2);

  scrollContainer.scrollTo({
    left: scrollTo,
    behavior: 'smooth' // 👈 movimiento suave
  });
}

fetchSalas() {
  this.todasCargadas = false;
  this.cargadas = 0;

  this.store.dispatch(new GetSalas(this.filters)).subscribe(() => {
    this.store.selectOnce(SalaState.salas).subscribe(salas => {
      this.totalSalas = salas.length;

      if (this.totalSalas === 0) {
        this.todasCargadas = true;
      } else {
        // ⏱️ Timeout de seguridad para forzar visibilidad si alguna imagen no responde
        setTimeout(() => {
          if (!this.todasCargadas && this.cargadas < this.totalSalas) {
            //console.warn('Timeout alcanzado. Forzando visibilidad.');
            this.todasCargadas = true;
          }
        }, 2000);
      }
    });
  });
}



onImagenCargada() {
  this.cargadas++;
 // console.log(`🧩 Imágenes cargadas: ${this.cargadas}/${this.totalSalas}`);
  if (this.cargadas >= this.totalSalas) {
    console.log('✅ Todas las imágenes procesadas, mostrando salas');
    this.todasCargadas = true;
  }
}


}
