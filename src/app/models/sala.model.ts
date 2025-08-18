export interface Sala {
  id_sala: number;
  nombre: string;
  ciudad: string;
  dificultad: string;
  jugadores: string; // se mantiene
  jugadores_min?: number; // nuevo
  jugadores_max?: number; // nuevo
  tiempo?: number; // nuevo
  descripcion?: string; // nuevo
  empresa: string; // empresa
  puntuacion?: number; // nuevo
  categorias: string[];
  idiomas: string[];
  cover_url?: string;
  favorito?: boolean; // visual (local)
  distancia_km?: number; // NUEVO: Distancia en km desde la ubicación del usuario
  precio_min_pp?: number; // NUEVO: Precio mínimo por persona
  precio_max_pp?: number; // NUEVO: Precio máximo por persona
}
