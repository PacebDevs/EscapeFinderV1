// src/app/models/filtros.model.ts
export interface FiltrosBusqueda {
  query?: string;
  ciudad?: string;
  categorias?: string[];
  dificultad?: string[];
  accesibilidad?: string[];
  restricciones_aptas?: string[];
  publico_objetivo?: string[];
  idioma?: string;
  actores?: boolean | 'true' | 'false';

  jugadores?: number | null;
  tipo_sala?: string[];

  precio?: number | null;         // precio por persona
  distancia_km?: number | null;   // usado en Tab1

  // coords pueden venir como number o string via queryParams
  lat?: number | string | null;
  lng?: number | string | null;

  // mapa extra
  bbox?: string;                  // "w,s,e,n"
  radio_km?: number | string;     // opcional si decides usar círculo
}
