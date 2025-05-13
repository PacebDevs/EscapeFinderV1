import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngxs/store';
import { ModalController } from '@ionic/angular';
import { GetSalas, SalaState } from '../states/salas/salas.state';
import { SocketService } from '../services/socket.service';
import { FiltersModalComponent } from '../components/filters-modal/filters-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CATEGORIAS } from '../constants/categorias.const';
import { UpdateSala } from '../states/salas/salas.state';


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
  public categoriasActivas: string[] = [];
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

    this.subs = [
      this.socketService.listenSalasUpdated().subscribe(() => {
        console.log('Alta y Baja');
        this.fetchSalas();
      }),
      this.socketService.listenSalaModificada().subscribe((salaModificada: any) => {
        console.log('modificación');
        // Solo actualizamos esa sala, sin recargar todo
        if (this.aplicaFiltros(salaModificada)) {
          this.store.dispatch(new UpdateSala(salaModificada));
        }
      })
    ];
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

  async selectCategoria(nombre: string) {
    const index = this.categoriasActivas.indexOf(nombre);
    if (index > -1) {
      this.categoriasActivas.splice(index, 1);
    } else {
      this.categoriasActivas.push(nombre);
    }
  
    // 👉 Filtro actualizado
    if (this.categoriasActivas.length === 0) {
      delete this.filters.categorias;
    } else {
      this.filters = { ...this.filters, categorias: [...this.categoriasActivas] };
    }
  
    // 👉 Vibración leve
    await Haptics.impact({ style: ImpactStyle.Light });
  
    this.fetchSalas();
  }
  
  aplicaFiltros(sala: any): boolean {
  if (this.filters.query) {
    const q = this.filters.query.toLowerCase();
    const nombre = sala.nombre?.toLowerCase() || '';
    const empresa = sala.empresa?.toLowerCase() || '';
    if (!nombre.includes(q) && !empresa.includes(q)) return false;
  }

  if (this.filters.categorias?.length > 0) {
    const categorias = sala.categorias || [];
    const intersecta = categorias.some(c => this.filters.categorias.includes(c));
    if (!intersecta) return false;
  }

  return true;
}


fetchSalas() {
  console.log('Entra en  FETCHSALAS')
  this.todasCargadas = false;
  this.cargadas = 0;

  this.store.dispatch(new GetSalas(this.filters)).subscribe(() => {
    this.store.selectOnce(SalaState.salas).subscribe(salas => {
      this.totalSalas = salas.length;

  console.log('Entra en  FETCHSALAS y estas son las salas a cargar totalSalas --> '+ this.totalSalas)
      if (this.totalSalas === 0) {
        this.todasCargadas = true;
      } else {
        // ⏱️ Timeout de seguridad para forzar visibilidad si alguna imagen no responde
        setTimeout(() => {
          if (!this.todasCargadas && this.cargadas < this.totalSalas) {
            console.warn('Timeout alcanzado. Forzando visibilidad.');
            this.todasCargadas = true;
          }
        }, 50);
      }
    });
  });
}



onImagenCargada() {
  this.cargadas++;
 console.log(`🧩 Imágenes cargadas: ${this.cargadas}/${this.totalSalas}`);
 //console.log(this.cargadas+ ' Entra en  onImagenCargada')
  if (this.cargadas >= this.totalSalas) {
    //console.log('✅ Todas las imágenes procesadas, mostrando salas');
    this.todasCargadas = true;
  }
}

  trackBySalaId(_i: number, sala: any): any {
    return sala.id_sala;
  }


}
