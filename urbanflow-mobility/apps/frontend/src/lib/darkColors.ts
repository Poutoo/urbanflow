/**
 * Couleurs de marque/transport utilisées comme texte/icône/bordure posées
 * directement sur le fond de page (pas comme fond plein avec texte blanc
 * dessus). Sur le fond sombre (#0B1622), plusieurs valeurs claires tombent
 * sous le seuil WCAG AA (4.5:1) : bus 2.72:1, marche 3.20:1, metro 2.90:1,
 * tram 3.63:1, accent/covoiturage 3.97:1, secondary 3.59:1 — vérifié par
 * calcul de luminance relative. velo (5.53:1) et trottinette (4.95:1)
 * passent déjà tels quels et n'ont pas de variante ici. rapidtransit
 * (RER/Transilien, 3.88:1) et le gris "muted" utilisé comme couleur de ligne
 * par défaut (3.77:1) ont aussi été vérifiés et ajoutés.
 */
const DARK_CONTENT_COLOR: Record<string, string> = {
  '#1A5F7A': '#5CB8DE', // primary
  '#2D7D46': '#4CC383', // secondary
  '#B85C00': '#E0913C', // accent / covoiturage
  '#1D4ED8': '#60A5FA', // transport.bus
  '#7C3AED': '#A78BFA', // transport.marche
  '#4F46E5': '#818CF8', // transport.metro
  '#B45309': '#FB923C', // transport.tram
  '#E11D48': '#FB7185', // RER/Transilien
  '#6B7280': '#9FB0C3', // muted (couleur de ligne par défaut)
};

/** Résout une couleur de marque vers sa variante lisible en mode sombre, si nécessaire. */
export function getContentColor(hex: string, isDark: boolean): string {
  if (!isDark) return hex;
  return DARK_CONTENT_COLOR[hex] ?? hex;
}
