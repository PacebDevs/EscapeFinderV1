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
}
