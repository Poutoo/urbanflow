export interface EcoBadgeLevel {
  level: 1 | 2 | 3;
  name: string;
  emoji: string;
  /** Couleur du design system associée au palier (voir tailwind.config.ts) */
  color: string;
  thresholdKg: number;
}

// Seuils alignés avec BADGE_THRESHOLDS_KG (apps/backend/src/co2/co2-dashboard.service.ts)
export const ECO_BADGE_LEVELS: EcoBadgeLevel[] = [
  { level: 1, name: 'Éco-débutant', emoji: '🌱', color: '#16A34A', thresholdKg: 5 }, // = transport.velo (vert clair)
  { level: 2, name: 'Éco-mobile', emoji: '🌿', color: '#2D7D46', thresholdKg: 25 }, // = secondary
  { level: 3, name: 'Éco-héros', emoji: '🌳', color: '#B45309', thresholdKg: 100 }, // = transport.tram
];
