// PR #25 — Constantes geográficas compartilhadas

export const DF_CENTER = {
  lat: -15.793889,
  lng: -47.882778,
  label: 'Brasília - Plano Piloto'
} as const;

export const DF_DEFAULT_ZOOM = 11;

export const MAP_CONFIG = {
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 18,
  minZoom: 10
} as const;
