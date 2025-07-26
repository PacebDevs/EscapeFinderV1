// tab1.page.ts
import { Component, OnInit, OnDestroy, ViewChild,  AfterViewInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { ModalController, IonContent } from '@ionic/angular';
import { GetSalas, AppendSalas, SalaState, UpdateSala } from '../states/salas/salas.state';
import { SocketService } from '../services/socket.service';
import { FiltersModalComponent } from '../components/filter-modal/filters-modal.component';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { CATEGORIAS } from '../constants/categorias.const';
import { Subscription } from 'rxjs';
import { IonInfiniteScroll } from '@ionic/angular';
import { UsuarioState } from '../states/usuario.state';


@Component({
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  standalone: false
})
export class Tab1Page implements OnInit, OnDestroy, AfterViewInit {
  categorias = CATEGORIAS;
  salas$ = this.store.select(SalaState.salas);
  filters: any = {};
  categoriasActivas: string[] = [];
  numeroSalas = 0;
  private subs: Subscription[] = [];
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
   @ViewChild(IonContent) pageContent!: IonContent;

  private latUsuario: number | null = null;
  private lngUsuario: number | null = null; 

  limit = 20;
  offset = 0;
  todasCargadas = false;
  cargando = false;
  observer!: IntersectionObserver;



  constructor(
    private store: Store,
    private socketService: SocketService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.subs.push(
      this.salas$.subscribe(salas => {
        this.numeroSalas = salas.length;
      })
    );
   this.subs.push(
    this.store.select(UsuarioState.ubicacion).subscribe(ubicacion => {
      const { ciudad, lat, lng } = ubicacion || {};
      this.latUsuario = lat ?? null;
      this.lngUsuario = lng ?? null;
      if (ciudad) {
        this.filters = { ...this.filters, ciudad };
      } else {
        const { ciudad: _c, ...rest } = this.filters;
        this.filters = { ...rest };
      }
    })
  );
    this.socketService.connect();
    this.subs.push(this.socketService.listenSalasUpdated().subscribe(() => this.reloadSalas()));
    this.subs.push(
      this.socketService.listenSalaModificada().subscribe(sala => {
        if (this.aplicaFiltros(sala)) {
          this.store.dispatch(new UpdateSala(sala));
        }
      })
    );

    this.reloadSalas();
  }

ngAfterViewInit() {
  this.observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    console.log('🎯 Observando intersección:', entry);
    if (entry.isIntersecting && !this.cargando && !this.todasCargadas) {
      this.loadMore();
    }
  });

}


  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.socketService.disconnect();
  
  }


  async selectCategoria(nombre: string) {
  if (nombre === 'Filtros') {
    await this.openFilters();
    return;
  }

  const index = this.categoriasActivas.indexOf(nombre);
  if (index > -1) {
    this.categoriasActivas.splice(index, 1);
  } else {
    this.categoriasActivas.push(nombre);
  }

  this.filters = this.categoriasActivas.length === 0
    ? { ...this.filters, categorias: undefined }
    : { ...this.filters, categorias: [...this.categoriasActivas] };

  await Haptics.impact({ style: ImpactStyle.Light });
  this.reloadSalas();
}

async openFilters() {
  const modal = await this.modalCtrl.create({
    component: FiltersModalComponent,
    componentProps: {
      filtrosActuales: this.filters
    },
    showBackdrop: true,
    cssClass: 'filters-modal-sheet',
    breakpoints: [0, 0.5, 1],
    initialBreakpoint: 1// porcenjage que ocupa la ventana de filtros al abrirse
  });

  await modal.present(); // 👈 Asegura que se presente

  const { data } = await modal.onDidDismiss();
console.log('data  -->'+  data )
  if (data) {
    this.filters = { ...this.filters, ...data };
    this.categoriasActivas = this.filters.categorias
      ? [...this.filters.categorias]
      : [];
    this.reloadSalas();
  }
}

  onCiudadSeleccionada(ciudad: string | null) {
    console.log(ciudad + 'Entra en onCiudadSeleccionada');
    if (ciudad) {
      this.filters = { ...this.filters, ciudad };
    } else {
     const { ciudad: _c, distancia_km: _d, ...rest } = this.filters;
      this.filters = { ...rest };
    }
    this.reloadSalas();
  }

  aplicaFiltros(sala: any): boolean {
    const q = this.filters.query?.toLowerCase() || '';
    const nombre = sala.nombre?.toLowerCase() || '';
    const empresa = sala.empresa?.toLowerCase() || '';
    if (q && !nombre.includes(q) && !empresa.includes(q)) return false;
    if (this.filters.categorias?.length > 0) {
      const categorias = sala.categorias || [];
      const intersecta = categorias.some(c => this.filters.categorias.includes(c));
      if (!intersecta) return false;
    }
    return true;
  }

  private getFiltros(offset: number): any {
    const filtros = { ...this.filters, offset, limit: this.limit };
    if (!filtros.distancia_km) {
      delete filtros.lat;
      delete filtros.lng;
    } else {
      filtros.lat = this.latUsuario;
      filtros.lng = this.lngUsuario;
    }
    return filtros;
  }

  reloadSalas() {
    this.pageContent?.scrollToTop(0);
    this.offset = 0;
    this.todasCargadas = false;
    this.cargando = true;
    const filtros = this.getFiltros(0);

    console.log('🧼 Filtros al resetear:', this.filters)
    console.log(filtros)
      
    this.store.dispatch(new GetSalas(filtros)).subscribe({
      next: () => {
        this.offset = this.limit;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        // Aquí podrías mostrar un toast o alerta
        console.error('Error al cargar salas', err);
      }
    });
  }



loadMore(event?: any) {
  if (this.cargando || this.todasCargadas) {
    event?.target?.complete();
    return;
  }

  this.cargando = true;
  const filtros = this.getFiltros(this.offset);

  this.store.dispatch(new AppendSalas(filtros)).subscribe((res: any) => {
    const recibidas = res.sala?.cantidad || 0;
    
    console.log(`🧾 Recibidas ${recibidas} salas, offset actual: ${this.offset}`);
//console.log('🧾 Recibidas IDs:', res.sala.salas.map(s => s.id_sala));
    this.offset += recibidas;

    if (recibidas === 0 || recibidas < this.limit) {
      this.todasCargadas = true;
    }

    event?.target?.complete();
    this.cargando = false;
  });
}




  trackBySalaId(_i: number, sala: any): any {
    return sala.id_sala;
  }
}
