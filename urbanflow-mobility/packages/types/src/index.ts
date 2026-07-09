// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
  ecoMobileBadge: boolean;
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

// ─── Profile ────────────────────────────────────────────────────────────────

export type TransportMode = 'velo' | 'bus' | 'tram' | 'metro' | 'marche' | 'trottinette' | 'covoiturage';
export type PriorityMode = 'fast' | 'ecological' | 'economic';

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
  darkModeEnabled: boolean;
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
  darkModeEnabled?: boolean;
  homeAddress?: string;
  homeCoordinates?: Coordinates;
  workAddress?: string;
  workCoordinates?: Coordinates;
  co2Goal?: number;
  name?: string;
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
