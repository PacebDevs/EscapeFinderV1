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

/**
 * Utilidades para abreviar tipos de vía y construir etiquetas de dirección.
 * - Normaliza (lower + sin acentos) para buscar en el diccionario.
 * - Devuelve el original si no hay match (no rompe datos).
 * - Cobertura ES/CAT/GL/EU + variantes y abreviaturas comunes.
 */

export function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Diccionario de tipos de vía -> abreviatura
 * Las CLAVES deben ir normalizadas (sin acentos y en minúsculas).
 */
const MAP: Record<string, string> = {
  // --- Castellano ---
  'calle': 'C.',
  'c/': 'C.',
  'c.': 'C.',
  'avenida': 'Av.',
  'av': 'Av.',
  'av.': 'Av.',
  'plaza': 'Pl.',
  'pza': 'Pl.',
  'pza.': 'Pl.',
  'paseo': 'P.º',
  'pso': 'P.º',
  'p.': 'P.º',
  'carretera': 'Ctra.',
  'ctra': 'Ctra.',
  'ctra.': 'Ctra.',
  'camino': 'Cno.',
  'cno': 'Cno.',
  'cno.': 'Cno.',
  'travesia': 'Trv.',
  'travesía': 'Trv.',
  'trva': 'Trv.',
  'trva.': 'Trv.',
  'ronda': 'Rda.',
  'glorieta': 'Gta.',
  'pasaje': 'Pje.',
  'callejon': 'Clj.',
  'callejón': 'Clj.',
  'bulevar': 'Blvr.',
  'bulebard': 'Blvr.',
  'urbanizacion': 'Urb.',
  'urbanización': 'Urb.',
  'poligono': 'Pol.',
  'polígono': 'Pol.',
  'via': 'Vía',
  'via pecuaria': 'Vía Pec.',
  'costanilla': 'Cta.',
  'cuesta': 'Cta.',
  'barrio': 'B.º',
  'barriada': 'Bda.',
  'vereda': 'Ver.',
  'parque': 'Pq.',
  'parc': 'Pq.',

  // --- Catalán / Valenciano ---
  'carrer': 'C.',
  'avinguda': 'Av.',
  'passeig': 'Pg.',
  'pg.': 'Pg.',
  'plaça': 'Pl.',
  'placa': 'Pl.',
  'travessera': 'Trv.',
  'travessia': 'Trv.',
  'rambla': 'Rbla.',
  'camí': 'Cno.',
  'cami': 'Cno.',
  'ronda (cat)': 'Rda.', // a veces llega ya como “Ronda”

  // --- Gallego ---
  'rua': 'R.',
  'rúa': 'R.',
  'praza': 'Pza.',
  'estrada': 'Estr.',
  'carreiro': 'Crro.',
  'camiño': 'Cno.',
  'camino (gl)': 'Cno.',

  // --- Euskera (formas más habituales que vemos en datos bilingües) ---
  'kalea': 'K.',
  'hiribidea': 'Hbda.',     // (avda.)
  'etorbidea': 'Etorb.',    // (avda.)
  'plaza (eu)': 'Pl.',      // muchos datos ya vienen en castellano
  'pasealekua': 'P.º',
};

/**
 * Abrevia un tipo de vía. Si no hay match, devuelve el original.
 */
export function abrevTipoVia(raw?: string | null): string | null {
  if (!raw) return null;
  const v = norm(raw);
  return MAP[v] ?? raw;
}

/**
 * Construye la etiqueta compacta para mostrar en UI:
 *   "<abrev tipo> <nombre> <numero> · <ciudad>"
 * Evita repetir ciudad si ya viene embebida en la vía.
 */
export function buildDireccionLabel(
  tipo_via?: string | null,
  nombre_via?: string | null,
  numero?: string | null,
  ciudad?: string | null
): string | null {
  const tv = abrevTipoVia(tipo_via?.trim() || null);
  const via = [tv, nombre_via?.trim(), numero?.trim()]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const c = (ciudad || '').trim();
  if (via && c) return via.includes(c) ? via : `${via} · ${c}`;
  return via || c || null;
}