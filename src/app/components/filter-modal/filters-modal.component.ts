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
    distancia_km: undefined,
    precio: null,
    tipo_sala: [],
    categorias: [],
    dificultad: [],
    accesibilidad: [],
    restricciones_aptas: [],
    publico_objetivo: [],
    actores: false, // 👈 Nuevo filtro para Actores
    idioma: null    // 👈 Nuevo filtro para Idioma
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
// 👇 Nuevas opciones para el desplegable de Idioma
idiomaOpciones: string[] = ['Español', 'Inglés', 'Catalán', 'Francés'];
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
      publico_objetivo: Array.isArray(this.filtrosActuales.publico_objetivo) ? [...this.filtrosActuales.publico_objetivo] : [],
      actores: this.filtrosActuales.actores === true,
     idioma: this.filtrosActuales.idioma || null,
      precio: this.filtrosActuales.precio ?? null,
      distancia_km: this.filtrosActuales.distancia_km ?? undefined
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
    this.restriccionesOpciones = this.restriccionesOpciones.map(opcion => ({
      ...opcion,
      checked: this.filtros.restricciones_aptas.includes(opcion.valor)
    }));
    this.publicoObjetivoOpciones = this.publicoObjetivoOpciones.map(opcion => ({
      ...opcion,
      checked: this.filtros.publico_objetivo.includes(opcion.valor)
    }));

    // 👇 Abrir automáticamente las secciones con selecciones previas
    this.isTipoSalaOpen = this.filtros.tipo_sala.length > 0;
    this.isAccesibilidadOpen = this.filtros.accesibilidad.length > 0;
    this.isRestriccionesOpen = this.filtros.restricciones_aptas.length > 0;
    this.isPublicoObjetivoOpen = this.filtros.publico_objetivo.length > 0;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

aplicarFiltros() {
  const filtrosParaEnviar = { ...this.filtros };

  // Booleanos: si es false, que vaya como undefined
  if (!filtrosParaEnviar.actores) filtrosParaEnviar.actores = undefined;

  // Listas: si quedan vacías, NO delete -> undefined (pisa el valor anterior en el padre)
  if (!filtrosParaEnviar.categorias?.length) filtrosParaEnviar.categorias = undefined;
  if (!filtrosParaEnviar.dificultad?.length) filtrosParaEnviar.dificultad = undefined;
  if (!filtrosParaEnviar.tipo_sala?.length) filtrosParaEnviar.tipo_sala = undefined;
  if (!filtrosParaEnviar.accesibilidad?.length) filtrosParaEnviar.accesibilidad = undefined;
  if (!filtrosParaEnviar.restricciones_aptas?.length) filtrosParaEnviar.restricciones_aptas = undefined;
  if (!filtrosParaEnviar.publico_objetivo?.length) filtrosParaEnviar.publico_objetivo = undefined;
  if (!filtrosParaEnviar.idioma) filtrosParaEnviar.idioma = undefined;
  if (!filtrosParaEnviar.precio) filtrosParaEnviar.precio = undefined;
  if (!filtrosParaEnviar.distancia_km) filtrosParaEnviar.distancia_km = undefined;

  this.modalCtrl.dismiss(filtrosParaEnviar);
}
resetearFiltros() {
  const ciudad = this.filtros.ciudad;

  this.filtros = {
    ciudad,
    jugadores: null,
    distancia_km: null, // si quieres resetear también la distancia
    precio: null,
    tipo_sala: [],
    categorias: [],
    dificultad: [],
    accesibilidad: [],
    restricciones_aptas: [],
    publico_objetivo: [],
    actores: false,
    idioma: null
  };

  // Desmarcar visualmente todos los checkboxes (nuevas refs -> change detection)
  this.tiposSalaOpciones = this.tiposSalaOpciones.map(t => ({ ...t, checked: false }));
  this.accesibilidadOpciones = this.accesibilidadOpciones.map(o => ({ ...o, checked: false }));
  this.restriccionesOpciones = this.restriccionesOpciones.map(o => ({ ...o, checked: false }));
  this.publicoObjetivoOpciones = this.publicoObjetivoOpciones.map(o => ({ ...o, checked: false }));
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
onDistanciaChange(event: any) {
  const value = event.detail.value;
  this.filtros.distancia_km = value === 0 ? undefined : value;
}


  get hasActiveFilters(): boolean {
  const f = this.filtros || {};
  // ❌ No cuenta 'ciudad'
  return !!(
    f.jugadores ||
    f.precio ||
    f.distancia_km ||
    (Array.isArray(f.tipo_sala) && f.tipo_sala.length) ||
    (Array.isArray(f.categorias) && f.categorias.length) ||
    (Array.isArray(f.dificultad) && f.dificultad.length) ||
    (Array.isArray(f.accesibilidad) && f.accesibilidad.length) ||
    (Array.isArray(f.restricciones_aptas) && f.restricciones_aptas.length) ||
    (Array.isArray(f.publico_objetivo) && f.publico_objetivo.length) ||
    f.actores === true ||
    !!f.idioma
  );
}

get activeFilterCount(): number {
  const f = this.filtros || {};
  let count = 0;

  // Jugadores
  if (f.jugadores) count++;
  // Precio
  if (f.precio) count++;
  // Distancia
  if (f.distancia_km) count++;
  // Arrays
  const arrays = [
    f.tipo_sala,
    f.categorias,
    f.dificultad,
    f.accesibilidad,
    f.restricciones_aptas,
    f.publico_objetivo
  ];
  arrays.forEach(arr => {
    if (Array.isArray(arr) && arr.length) count += arr.length;
  });
  // Booleanos
  if (f.actores === true) count++;
  // Select idioma
  if (f.idioma) count++;

  return count;
}

onResetClick(ev: Event) {
  const el = ev.currentTarget as HTMLElement;
  el.classList.remove('reset-anim');
  // Reinicia animaciones si clicas varias veces
  void el.offsetWidth;
  el.classList.add('reset-anim');

  this.resetearFiltros();
}
}