import { Sala } from '../models/sala.model';

/**
 * Enriches a Sala with a formatted jugadores string
 * combining jugadores_min and jugadores_max.
 */
export function enrichSala(sala: Sala): Sala {
  return {
    ...sala,
    jugadores: `${sala.jugadores_min} - ${sala.jugadores_max}`
  };
}