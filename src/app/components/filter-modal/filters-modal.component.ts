import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { CATEGORIAS } from '../../constants/categorias.const';
@Component({
  selector: 'app-filters-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule ],
  templateUrl: './filters-modal.component.html',
  styleUrls: ['./filters-modal.component.scss']
})
export class FiltersModalComponent implements OnInit {
  @Input() filtrosActuales: any = {};
 // distancia: number = 10;
  filtros: any = {
    jugadores: null,
    tipo_sala: [],
    categorias: [],
    dificultad: [],
    accesibilidad: [],
    restricciones_aptas: [],
    publico_objetivo: [] // 👈 Nuevo filtro
  };
jugadoresOpciones = [2, 3, 4, 5, 6, 7, 8, 9, 10];
tiposSalaOpciones: any[] = [ // 👈 CAMBIO: Especificar el tipo como any[]
  'Al aire libre',
  'Escape Room',
  'Experiencia',
  'Hall game',
  'Juego portátil',
  'Realidad Virtual'
];
dificultadOpciones = ['Fácil', 'Media', 'Alta'];
accesibilidadOpciones: any[] = [
  { texto: 'Apto Discapacidad motora', valor: 'Apto Discapacidad motora', icono: 'walk-outline' },
  { texto: 'Apto Discapacidad visual', valor: 'Apto Discapacidad visual', icono: 'eye-off-outline' },
  { texto: 'Apto Discapacidad auditiva', valor: 'Apto Discapacidad auditiva', icono: 'ear-outline' }
];
// 👇 Nuevas opciones de restricciones
restriccionesOpciones: any[] = [
  { texto: 'Apto para embarazadas', valor: 'Mujeres embarazadas', icono: 'body-outline' },
  { texto: 'Apto para claustrofobia', valor: 'Claustrofobia', icono: 'lock-open-outline' }
];
// 👇 Nuevas opciones de público objetivo
publicoObjetivoOpciones: any[] = [
  { texto: 'Niños con adulto', valor: 'Niños con adulto', icono: 'people-circle-outline' },
  { texto: 'Niños con Monitor', valor: 'Niños con Monitor', icono: 'school-outline' },
  { texto: 'Empresas', valor: 'Empresas', icono: 'business-outline' },
  { texto: 'Grupos grandes', valor: 'Grupos grandes', icono: 'people-outline' },
  { texto: 'Estandar', valor: 'Estandar', icono: 'person-outline' },
  { texto: 'Familiar', valor: 'Familiar', icono: 'home-outline' },
  { texto: 'Niños', valor: 'Niños', icono: 'happy-outline' }
];
categoriasOpciones = CATEGORIAS.slice(1);
isTipoSalaOpen = false;
isAccesibilidadOpen = false;
isRestriccionesOpen = false;
isPublicoObjetivoOpen = false; // 👈 Nuevo: para controlar el desplegable
_tieneUbicacion: boolean = false;

  constructor(private modalCtrl: ModalController, private store: Store) {}

  ngOnInit() {
    this.filtros = {
      ...this.filtros,
      ...this.filtrosActuales,
      categorias: Array.isArray(this.filtrosActuales.categorias) ? [...this.filtrosActuales.categorias] : [],
      dificultad: Array.isArray(this.filtrosActuales.dificultad) ? [...this.filtrosActuales.dificultad] : [],
      tipo_sala: Array.isArray(this.filtrosActuales.tipo_sala) ? [...this.filtrosActuales.tipo_sala] : [],
      accesibilidad: Array.isArray(this.filtrosActuales.accesibilidad) ? [...this.filtrosActuales.accesibilidad] : [],
      restricciones_aptas: Array.isArray(this.filtrosActuales.restricciones_aptas) ? [...this.filtrosActuales.restricciones_aptas] : [],
      publico_objetivo: Array.isArray(this.filtrosActuales.publico_objetivo) ? [...this.filtrosActuales.publico_objetivo] : [], // 👈 Inicializar
    };
    this._tieneUbicacion = !!this.filtrosActuales.ciudad;

    this.tiposSalaOpciones = this.tiposSalaOpciones.map(nombre => ({
      nombre,
      checked: this.filtros.tipo_sala.includes(nombre)
    }));

    this.accesibilidadOpciones = this.accesibilidadOpciones.map(opcion => ({
      ...opcion,
      checked: this.filtros.accesibilidad.includes(opcion.valor)
    }));

    // 👈 Mapear opciones de restricciones para incluir el estado 'checked'
    this.restriccionesOpciones = this.restriccionesOpciones.map(opcion => ({
      ...opcion,
      checked: this.filtros.restricciones_aptas.includes(opcion.valor)
    }));

    // 👈 Mapear opciones de público objetivo para incluir el estado 'checked'
    this.publicoObjetivoOpciones = this.publicoObjetivoOpciones.map(opcion => ({
      ...opcion,
      checked: this.filtros.publico_objetivo.includes(opcion.valor)
    }));
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  aplicarFiltros() {
    const filtrosParaEnviar = { ...this.filtros };

    if (filtrosParaEnviar.categorias?.length === 0) delete filtrosParaEnviar.categorias;
    if (filtrosParaEnviar.dificultad?.length === 0) delete filtrosParaEnviar.dificultad;
    if (filtrosParaEnviar.tipo_sala?.length === 0) delete filtrosParaEnviar.tipo_sala;
    if (filtrosParaEnviar.accesibilidad?.length === 0) delete filtrosParaEnviar.accesibilidad;
    if (filtrosParaEnviar.restricciones_aptas?.length === 0) delete filtrosParaEnviar.restricciones_aptas;
    if (filtrosParaEnviar.publico_objetivo?.length === 0) delete filtrosParaEnviar.publico_objetivo; // 👈 Limpiar si está vacío

    this.modalCtrl.dismiss(filtrosParaEnviar);
  }
resetearFiltros() {
  const ciudad = this.filtros.ciudad;
  this.filtros = {
    ciudad,
    jugadores: null,
    tipo_sala: [],
    categorias: [],
    dificultad: [],
    accesibilidad: [],
    restricciones_aptas: [],
    publico_objetivo: [] // 👈 Resetear
  };
  
}

toggleTipoSala() {
  this.isTipoSalaOpen = !this.isTipoSalaOpen;
}

toggleAccesibilidad() {
  this.isAccesibilidadOpen = !this.isAccesibilidadOpen;
}

toggleRestricciones() {
  this.isRestriccionesOpen = !this.isRestriccionesOpen;
}

// 👇 Nuevo: Abre y cierra el desplegable de público objetivo
togglePublicoObjetivo() {
  this.isPublicoObjetivoOpen = !this.isPublicoObjetivoOpen;
}

onToggleTipo() {
  this.filtros.tipo_sala = (this.tiposSalaOpciones as any[])
    .filter(t => t.checked)
    .map(t => t.nombre);
}

onToggleAccesibilidad() {
  this.filtros.accesibilidad = this.accesibilidadOpciones
    .filter(opcion => opcion.checked)
    .map(opcion => opcion.valor);
}

// 👇 Nuevo: Actualiza los filtros cuando un checkbox de restricciones cambia
onToggleRestricciones() {
  this.filtros.restricciones_aptas = this.restriccionesOpciones
    .filter(opcion => opcion.checked)
    .map(opcion => opcion.valor);
}

// 👇 Nuevo: Actualiza los filtros cuando un checkbox de público objetivo cambia
onTogglePublicoObjetivo() {
  this.filtros.publico_objetivo = this.publicoObjetivoOpciones
    .filter(opcion => opcion.checked)
    .map(opcion => opcion.valor);
}

toggleCategoria(cat: string) {
  const idx = this.filtros.categorias.indexOf(cat);
  if (idx > -1) {
    this.filtros.categorias.splice(idx, 1);
  } else {
    this.filtros.categorias.push(cat);
  }
}

toggleDificultad(dificultad: string) {
    const idx = this.filtros.dificultad.indexOf(dificultad);
    if (idx > -1) {
      this.filtros.dificultad.splice(idx, 1);
    } else {
      this.filtros.dificultad.push(dificultad);
    }
  }
}