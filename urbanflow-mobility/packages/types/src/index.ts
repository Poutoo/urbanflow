// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  avatarId: AvatarId | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

/** Résumé du profil retourné par GET /auth/me (badge + progression CO₂ incluse) */
export interface AuthMeProfile {
  preferredModes: TransportMode[];
  priorityMode: PriorityMode;
  pmrEnabled: boolean;
  co2Goal: number;
  totalCo2SavedKg: number;
  /** Palier du badge éco-mobile : 0 = aucun, 1 = Éco-débutant, 2 = Éco-mobile, 3 = Éco-héros */
  badgeLevel: number;
}

export interface AuthMeResponse extends AuthUser {
  profile: AuthMeProfile;
}

// ─── JWT ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ─── Avatars prédéfinis ─────────────────────────────────────────────────────

/** Seule source de vérité pour les avatars sélectionnables (backend + frontend). */
export const AVATAR_IDS = [
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
  'avatar-09',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

// ─── Profile ────────────────────────────────────────────────────────────────

export type TransportMode = 'velo' | 'bus' | 'tram' | 'metro' | 'marche' | 'trottinette' | 'covoiturage';
export type PriorityMode = 'fast' | 'ecological' | 'economic';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface UserProfile {
  id: string;
  userId: string;
  preferredModes: TransportMode[];
  priorityMode: PriorityMode;
  pmrEnabled: boolean;
  noStairsEnabled: boolean;
  voiceGuidanceEnabled: boolean;
  themeMode: ThemeMode;
  homeAddress: string | null;
  homeCoordinates: Coordinates | null;
  workAddress: string | null;
  workCoordinates: Coordinates | null;
  co2Goal: number;
}

export interface UpdateProfilePayload {
  preferredModes?: TransportMode[];
  priorityMode?: PriorityMode;
  pmrEnabled?: boolean;
  noStairsEnabled?: boolean;
  voiceGuidanceEnabled?: boolean;
  themeMode?: ThemeMode;
  homeAddress?: string;
  homeCoordinates?: Coordinates;
  workAddress?: string;
  workCoordinates?: Coordinates;
  co2Goal?: number;
  name?: string;
  avatarId?: AvatarId;
}

// ─── Adresses favorites ─────────────────────────────────────────────────────

export interface FavoriteAddress {
  id: string;
  userId: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface CreateFavoriteAddressPayload {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface UpdateFavoriteAddressPayload {
  label?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export interface RoutePoint {
  address: string;
  lat: number;
  lng: number;
}

export interface SavedRoute {
  id: string;
  userId: string;
  name: string;
  from: RoutePoint;
  to: RoutePoint;
  createdAt: string;
}

// ─── GBFS (vélos en libre-service) ────────────────────────────────────────────

export interface GbfsStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bikesAvailable: number;
  docksAvailable: number;
}

/** Station Vélib' recommandée au départ d'un trajet écologique + distance à pied */
export interface RecommendedBikeStation {
  station: GbfsStation;
  distanceM: number;
}

// ─── CO₂ Dashboard ──────────────────────────────────────────────────────────

export interface WeeklyDay {
  label: string; // "L", "M", "M", "J", "V", "S", "D"
  date: string; // "2026-07-08"
  co2SavedKg: number;
}

export interface WeeklyStats {
  days: WeeklyDay[];
  totalWeekKg: number;
}

export interface MonthlyProgress {
  savedKg: number;
  goalKg: number;
  progressPercent: number;
  remainingKg: number;
}

export interface ModeBreakdownItem {
  mode: string;
  distanceKm: number;
  count: number;
  percentage: number;
}

export interface Co2Summary {
  weekly: WeeklyStats;
  monthly: MonthlyProgress;
  breakdown: ModeBreakdownItem[];
}

// ─── API Generic ─────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
