import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store, Select } from '@ngxs/store';
import { FavoritosState, LoadFavoritos, SalaFavorita } from '../states/favoritos.state';
import { AuthState } from '../states/auth.state';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {
  @Select(FavoritosState.favoritos) favoritos$!: Observable<SalaFavorita[]>;
  @Select(FavoritosState.loading) loading$!: Observable<boolean>;
  @Select(FavoritosState.ids) ids$!: Observable<number[]>;
  
  loading = false;
  private subscription?: Subscription;

  constructor(
    private store: Store,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadFavoritos();
    
    this.loading$.subscribe(loading => {
      this.loading = loading;
    });

    // Detectar cambios en IDs y recargar si hay nuevos
    this.subscription = combineLatest([this.ids$, this.favoritos$]).subscribe(([ids, favoritos]) => {
      const favoritoIds = favoritos.map(f => f.id_sala);
      const hasNewIds = ids.some(id => !favoritoIds.includes(id));
      
      if (hasNewIds && ids.length > 0) {
        console.log('🔄 Detectados nuevos favoritos, recargando...');
        this.loadFavoritos();
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  /**
   * Cargar favoritos completos desde el backend con distancia
   */
  loadFavoritos() {
    console.log('⭐ Cargando favoritos completos...');
    
    // Obtener ubicación actual del estado
    const ubicacion = this.store.selectSnapshot(AuthState.ubicacion);
    
    // Preparar coordenadas si están disponibles
    const coordenadas = (ubicacion?.lat && ubicacion?.lng)
      ? { lat: ubicacion.lat, lng: ubicacion.lng }
      : undefined;
    
    console.log('📍 Cargando favoritos con coordenadas:', coordenadas);
    this.store.dispatch(new LoadFavoritos(coordenadas));
  }

  /**
   * Pull to refresh
   */
  doRefresh(event: any) {
    console.log('⭐ Refresh favoritos');
    
    // Obtener ubicación actual del estado
    const ubicacion = this.store.selectSnapshot(AuthState.ubicacion);
    const coordenadas = (ubicacion?.lat && ubicacion?.lng)
      ? { lat: ubicacion.lat, lng: ubicacion.lng }
      : undefined;
    
    this.store.dispatch(new LoadFavoritos(coordenadas)).subscribe({
      complete: () => {
        event.target.complete();
      },
      error: () => {
        event.target.complete();
      }
    });
  }

  /**
   * Abrir detalle de sala
   */
  abrirSalaDetalle(id_sala: number) {
    console.log('📖 Abrir detalle sala:', id_sala);
    this.router.navigate(['/sala-detalle', id_sala]);
  }

  /**
   * TrackBy para optimizar renderizado
   */
  trackBySalaId(index: number, sala: SalaFavorita): number {
    return sala.id_sala;
  }
}
