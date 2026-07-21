/**
 * Couleurs de marque/transport utilisées comme texte/icône/bordure posées
 * directement sur le fond de page (pas comme fond plein avec texte blanc
 * dessus). Sur le fond sombre (#0B1622), plusieurs valeurs claires tombent
 * sous le seuil WCAG AA (4.5:1) : bus 2.72:1, marche 3.20:1, metro 2.90:1,
 * tram 3.63:1, accent/covoiturage 3.97:1, secondary 3.59:1 — vérifié par
 * calcul de luminance relative. rapidtransit (RER/Transilien, 3.88:1) et le
 * gris "muted" utilisé comme couleur de ligne par défaut (3.77:1) aussi.
 *
 * velo et trottinette passaient (5.53:1 et 4.95:1) comme texte plein posé
 * directement sur le fond de page — mais Lighthouse (audit Phase 4, écran
 * Profil) a révélé qu'utilisées en pastille translucide (fond à ~8-12%
 * d'opacité composité sur --color-surface, cf. Badge.tsx/EcoBadge.tsx), le
 * fond composité résultant est plus clair que le fond de page brut, ce qui
 * réduit l'écart de luminance sous 4.5:1 (velo 4.09-4.24:1, selon l'alpha).
 * D'où leur ajout ici aussi, alignés sur le même traitement que les autres.
 */
const DARK_CONTENT_COLOR: Record<string, string> = {
  '#1A5F7A': '#5CB8DE', // primary
  '#2D7D46': '#4CC383', // secondary
  '#B85C00': '#E0913C', // accent / covoiturage
  '#1D4ED8': '#60A5FA', // transport.bus
  '#7C3AED': '#A78BFA', // transport.marche
  '#4F46E5': '#818CF8', // transport.metro
  '#B45309': '#FB923C', // transport.tram
  '#16A34A': '#4ADE80', // transport.velo (5.53:1 en texte plein, insuffisant en pastille)
  '#0891B2': '#22D3EE', // transport.trottinette (4.95:1 en texte plein, insuffisant en pastille)
  '#E11D48': '#FB7185', // RER/Transilien
  '#6B7280': '#9FB0C3', // muted (couleur de ligne par défaut)
  '#0e60a3ff': '#4FA8DE', // RouteCard, stratégie "économique" (2.80:1 → 6.93:1)
  '#6D28D9': '#C084FC', // SectionPill, walking/street_network (2.57:1 → 6.90:1)
  '#15803D': '#22C55E', // SectionPill, bicycle/bss_rent (3.63:1 → 8.00:1)
  '#4338CA': '#818CF8', // SectionPill, metro (2.31:1 → 6.11:1)
  '#B91C1C': '#F87171', // SectionPill, rapidtransit (2.82:1 → 6.59:1)
};

/** Résout une couleur de marque vers sa variante lisible en mode sombre, si nécessaire. */
export function getContentColor(hex: string, isDark: boolean): string {
  if (!isDark) return hex;
  return DARK_CONTENT_COLOR[hex] ?? hex;
}

/**
 * Convertit un hex #RRGGBB en rgba() avec l'alpha donné — sert à dériver des
 * fonds/bordures teintés en sombre à partir d'une couleur de contenu déjà
 * résolue, sans avoir à choisir une seconde palette de pastels à la main
 * (les pastels clairs du mode clair, ex. #FFF7ED, ne fonctionnent pas sur
 * fond sombre).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
