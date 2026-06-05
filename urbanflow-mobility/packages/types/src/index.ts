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

// ─── API Generic ─────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
