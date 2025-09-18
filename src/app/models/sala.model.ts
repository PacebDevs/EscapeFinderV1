export interface SalaCaracteristica {
  tipo: 'publico_objetivo' | 'restriccion' | 'accesibilidad' | string;
  nombre: string;
  es_apta: boolean;
}

export interface SalaImagen {
  url: string;
  tipo: 'gallery' | 'cover' | string;
}

export interface SalaPrecioPorJugadores {
  jugadores: number;
  total: string; // viene como DECIMAL en string desde la API
  pp: string;    // viene como DECIMAL en string desde la API
}

export interface Sala {
  id_sala: number;
  id_local: number;
  id_tipo_reserva?: number | null;

  nombre: string;
  descripcion?: string | null;
  tiempo?: string | number | null;
  jugadores_min?: number | null;
  jugadores_max?: number | null;
  actores?: boolean | null;
  experiencia_por_jugador?: number | string | null;
  cover_url?: string | null;
  dificultad?: string | null;
  descripcion_corta?: string | null;

  // Datos derivados/relacionados
  distancia_km?: number | null;
  precio_min_pp?: string | null;
  precio_max_pp?: string | null;
  nombre_local?: string | null;

  // Derivados solo en front
  jugadores?: string; // ej. "4 - 20"

  // Dirección
  id_direccion?: number | null;
  tipo_via?: string | null;
  nombre_via?: string | null;
  numero?: string | null;
  ampliacion?: string | null;
  codigo_postal?: string | null;
  ciudad?: string | null;
  codigo_google?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  // Mapa estático
  mapa_estatico_url?: string; // URL del mapa estático generado en el backend
  // Empresa / reserva
  empresa?: string | null;
  tipo_reserva?: string | null;

  // Listas
  categorias?: string[];
  idiomas?: string[];
  tipo_sala?: string[];

  // Solo en detalle
  caracteristicas?: SalaCaracteristica[];
  imagenes?: SalaImagen[];
  precios_por_jugadores?: SalaPrecioPorJugadores[];
}
