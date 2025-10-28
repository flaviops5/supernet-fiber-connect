// >>> PR10B: centroids simplificados do DF (ajuste livre quando quiser)
export const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Brasília": { lat: -15.793889, lng: -47.882778 },
  "Plano Piloto": { lat: -15.776, lng: -47.889 },
  "Sobradinho": { lat: -15.6505, lng: -47.7892 },
  "Planaltina": { lat: -15.6146, lng: -47.6509 },
  "Gama": { lat: -16.0146, lng: -48.063 },
  "Guará": { lat: -15.8344, lng: -47.9396 },
  "Ceilândia": { lat: -15.8149, lng: -48.1064 },
  "Samambaia": { lat: -15.8753, lng: -48.0813 },
  "Taguatinga": { lat: -15.8319, lng: -48.0609 },
  "Águas Claras": { lat: -15.8340, lng: -48.0081 },
  "Santa Maria": { lat: -16.0203, lng: -48.0008 },
  "São Sebastião": { lat: -15.9052, lng: -47.7805 },
  "Recanto das Emas": { lat: -15.932, lng: -48.064 },
  "Riacho Fundo": { lat: -15.884, lng: -47.984 },
  "Riacho Fundo II": { lat: -15.919, lng: -48.033 },
  "Cruzeiro": { lat: -15.791, lng: -47.945 },
  "Sudoeste/Octogonal": { lat: -15.794, lng: -47.926 },
  "Lago Norte": { lat: -15.735, lng: -47.877 },
  "Lago Sul": { lat: -15.843, lng: -47.891 },
};

export function toCoord(cidade?: string | null) {
  if (!cidade) return null;
  const key = cidade.trim();
  return CITY_CENTROIDS[key] ?? null;
}
// <<< PR10B
