export interface Categoria {
    nombre: string;   // Visible para el usuario
    valor: string;    // Enviado al backend
    icono: string;
  }
  
  export const CATEGORIAS: Categoria[] = [
   // { nombre: 'Filtros',          valor: 'Filtros',          icono: 'assets/categorias/varita-magica.png' },
    { nombre: 'Fantasía',         valor: 'fantasia',         icono: 'assets/categorias/book.png' },
    { nombre: 'Aventuras',        valor: 'aventuras',        icono: 'assets/categorias/map.png' },
    { nombre: 'Terror',           valor: 'terror',           icono: 'assets/categorias/skull.png' },
    { nombre: 'C. Ficción',       valor: 'Ciencia Ficción',  icono: 'assets/categorias/ufo.png' },
    { nombre: 'Historia',         valor: 'historia',         icono: 'assets/categorias/greek-pillars.png' },
    { nombre: 'Apocalíptico',     valor: 'apocaliptico',     icono: 'assets/categorias/nuclear-bomb.png' },
    { nombre: 'Misterio',         valor: 'misterio',         icono: 'assets/categorias/footprint.png' },
    { nombre: 'Policíaca',        valor: 'policiaca',        icono: 'assets/categorias/police-car.png' },
    { nombre: 'Criminal',         valor: 'criminal',         icono: 'assets/categorias/money-bag_02.png' },
    { nombre: 'Adultos',          valor: 'adultos',          icono: 'assets/categorias/wine.png' },
    { nombre: 'Niños',            valor: 'ninos',            icono: 'assets/categorias/cubes.png' },
  ];
