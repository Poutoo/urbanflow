# Sprint 2 — Planificateur multimodal

> **Objectif** : Implémenter F2 de bout en bout — carte Leaflet, géolocalisation, intégration Navitia.io, GBFS, cache Redis, calcul CO₂, et UI des résultats d'itinéraires.
> **Branche Git** : `feat/sprint-2-planner`
> **Critère de validation** : L'utilisateur connecté peut chercher un itinéraire depuis sa position GPS jusqu'à une adresse, et voir les 3 options (Rapide / Écologique / Économique) affichées sur la carte Leaflet avec le CO₂ estimé.

---

## ⚠️ Pièges à éviter AVANT de commencer

**Leaflet + Next.js = SSR incompatible.**
Leaflet utilise `window` et `document` — ils n'existent pas côté serveur.
La carte DOIT être importée avec `dynamic()` et `ssr: false`. Sinon : crash immédiat.

```typescript
// apps/frontend/src/components/map/Map.tsx
'use client'
// ... composant Leaflet normal

// apps/frontend/src/app/(app)/carte/page.tsx
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/map/Map'), { ssr: false })
```

Ne pas oublier d'importer le CSS Leaflet dans `globals.css` :
```css
@import 'leaflet/dist/leaflet.css';
```

Et corriger l'icône Leaflet cassée dans Next.js (problème connu) :
```typescript
import L from 'leaflet'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})
```
Copier les fichiers depuis `node_modules/leaflet/dist/images/` vers `public/leaflet/`.

---

## Étapes dans l'ordre (NE PAS SAUTER)

### ✅ ÉTAPE 1 — Modules NestJS Sprint 2 (structure) (30min)

**1.1 Créer la structure des nouveaux modules**
```
apps/backend/src/
├── routes/
│   ├── routes.module.ts
│   ├── routes.controller.ts
│   ├── routes.service.ts
│   ├── dto/
│   │   ├── search-routes.dto.ts
│   │   └── route-result.dto.ts
│   └── interfaces/
│       └── route.interface.ts
├── navitia/
│   ├── navitia.module.ts
│   └── navitia.service.ts        # Adapter API Navitia.io
├── gbfs/
│   ├── gbfs.module.ts
│   └── gbfs.service.ts           # Adapter flux GBFS
├── co2/
│   ├── co2.module.ts
│   └── co2.service.ts            # Calcul CO₂ ADEME
└── cache/
    ├── cache.module.ts
    └── cache.service.ts          # Wrapper Redis
```

**1.2 Installer les dépendances backend**
```bash
cd apps/backend
pnpm add @nestjs/axios axios
pnpm add ioredis
pnpm add -D @types/ioredis
```

**1.3 Installer les dépendances frontend**
```bash
cd apps/frontend
pnpm add leaflet react-leaflet
pnpm add -D @types/leaflet
```

**Checkpoint 1 ✅** : Structure créée, dépendances installées, build ne casse pas.

---

### ✅ ÉTAPE 2 — Service Cache Redis (30min)

**2.1 Cache service (wrapper Redis avec TTL)**

```typescript
// apps/backend/src/cache/cache.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Redis

  constructor(private config: ConfigService) {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!)
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key)
    return data ? (JSON.parse(data) as T) : null
  }

  async set(key: string, value: unknown, ttlSeconds = 120): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  onModuleDestroy() {
    this.client.disconnect()
  }
}
```

**Clé de cache pour les itinéraires :**
```typescript
// Format : routes:{fromLat},{fromLng}:{toLat},{toLng}:{departureTime}
const cacheKey = `routes:${from.lat},${from.lng}:${to.lat},${to.lng}:${departureTime}`
```

**Checkpoint 2 ✅** : `CacheService.get()` et `set()` fonctionnent avec Redis local.

---

### ✅ ÉTAPE 3 — Service Navitia.io (1h)

**3.1 Clé API Navitia**
Inscription gratuite sur https://navitia.io → clé API dans `.env` :
```env
NAVITIA_API_KEY=your_navitia_key_here
NAVITIA_BASE_URL=https://api.navitia.io/v1
```

**3.2 Format de la requête Navitia**
```
GET /v1/coverage/fr-idf/journeys
  ?from={lon};{lat}
  ?to={lon};{lat}
  ?datetime={YYYYMMDDTHHMMSS}
  ?count=5
  &forbidden_uris[]=physical_mode:Car
```
⚠️ Navitia utilise `{longitude};{latitude}` (lon d'abord, pas lat).

**3.3 NavitiaService**
```typescript
// apps/backend/src/navitia/navitia.service.ts
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

interface Coordinates { lat: number; lng: number }

@Injectable()
export class NavitiaService {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.baseUrl = this.config.get('NAVITIA_BASE_URL')!
    this.apiKey = this.config.get('NAVITIA_API_KEY')!
  }

  async getJourneys(from: Coordinates, to: Coordinates, datetime: string) {
    const url = `${this.baseUrl}/coverage/fr-idf/journeys`
    const response = await firstValueFrom(
      this.http.get(url, {
        params: {
          from: `${from.lng};${from.lat}`,   // ⚠️ lon;lat (ordre Navitia)
          to: `${to.lng};${to.lat}`,
          datetime,
          count: 5,
        },
        headers: { Authorization: this.apiKey },
      }),
    )
    return response.data.journeys ?? []
  }
}
```

**3.4 Format de réponse Navitia (simplifié)**
```json
{
  "journeys": [
    {
      "duration": 1380,
      "departure_date_time": "20260615T083000",
      "arrival_date_time": "20260615T085300",
      "sections": [
        {
          "type": "public_transport",
          "display_informations": { "commercial_mode": "Metro", "label": "M2" },
          "duration": 660,
          "from": { "stop_point": { "coord": { "lat": "48.87", "lon": "2.34" } } },
          "to": { "stop_point": { "coord": { "lat": "48.86", "lon": "2.36" } } }
        }
      ]
    }
  ]
}
```

**Checkpoint 3 ✅** : `NavitiaService.getJourneys()` retourne des résultats réels avec la clé API.

---

### ✅ ÉTAPE 4 — Service CO₂ ADEME (30min)

**4.1 Facteurs d'émission ADEME Base Carbone (kgCO₂/km/passager)**
```typescript
// apps/backend/src/co2/co2.service.ts
export const ADEME_FACTORS: Record<string, number> = {
  walking:          0,       // Marche
  bicycle:          0.005,   // Vélo (production/maintenance)
  bss_rent:         0.005,   // Vélo en libre-service
  car:              0.218,   // Voiture solo (référence)
  ridesharing:      0.073,   // Covoiturage (2 personnes)
  bus:              0.113,   // Bus thermique
  trolleybus:       0.025,   // Trolleybus
  metro:            0.004,   // Métro électrique
  tram:             0.004,   // Tramway électrique
  train:            0.009,   // Train (TER/RER)
  rapidtransit:     0.006,   // RER / BRT
  default:          0.050,   // Fallback
}

@Injectable()
export class Co2Service {
  calculateJourneyCo2(sections: NavitiaSection[]): number {
    return sections.reduce((total, section) => {
      const mode = section.type === 'public_transport'
        ? section.display_informations?.physical_mode?.toLowerCase() ?? 'default'
        : section.type
      const factor = ADEME_FACTORS[mode] ?? ADEME_FACTORS.default
      const distanceKm = (section.geojson?.length ?? 0) / 1000
      return total + factor * distanceKm
    }, 0)
  }

  calculateCarEquivalent(distanceKm: number): number {
    return ADEME_FACTORS.car * distanceKm
  }

  calculateCo2Saved(journeyCo2: number, distanceKm: number): number {
    return Math.max(0, this.calculateCarEquivalent(distanceKm) - journeyCo2)
  }
}
```

**Checkpoint 4 ✅** : Test unitaire `Co2Service` — calcul correct sur un trajet métro de 5 km.

---

### ✅ ÉTAPE 5 — Service GBFS (45min)

**5.1 Principe GBFS**
GBFS expose 3 endpoints principaux :
- `station_information.json` — positions des stations (statique, TTL 1h)
- `station_status.json` — disponibilités temps réel (TTL 30s)
- `free_bike_status.json` — vélos en free-floating (TTL 30s)

**5.2 GbfsService**
```typescript
// apps/backend/src/gbfs/gbfs.service.ts
@Injectable()
export class GbfsService {
  constructor(
    private http: HttpService,
    private cache: CacheService,
  ) {}

  // URL publique Vélib' Paris (à adapter selon la ville)
  private readonly STATIONS_URL =
    'https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_status.json'
  private readonly INFO_URL =
    'https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/station_information.json'

  async getNearbyStations(lat: number, lng: number, radiusMeters = 400) {
    const cacheKey = `gbfs:nearby:${Math.round(lat * 100)},${Math.round(lng * 100)}`
    const cached = await this.cache.get<GbfsStation[]>(cacheKey)
    if (cached) return cached

    const [infoRes, statusRes] = await Promise.all([
      firstValueFrom(this.http.get(this.INFO_URL)),
      firstValueFrom(this.http.get(this.STATIONS_URL)),
    ])

    const stations = this.mergeAndFilterNearby(
      infoRes.data.data.stations,
      statusRes.data.data.stations,
      lat, lng, radiusMeters,
    )

    await this.cache.set(cacheKey, stations, 30) // TTL 30s
    return stations
  }

  private mergeAndFilterNearby(info: any[], status: any[], lat: number, lng: number, radius: number) {
    const statusMap = new Map(status.map((s: any) => [s.station_id, s]))
    return info
      .map((station: any) => ({
        id: station.station_id,
        name: station.name,
        lat: station.lat,
        lng: station.lon,
        bikesAvailable: statusMap.get(station.station_id)?.num_bikes_available ?? 0,
        docksAvailable: statusMap.get(station.station_id)?.num_docks_available ?? 0,
      }))
      .filter((s) => this.distanceMeters(lat, lng, s.lat, s.lng) <= radius)
      .sort((a, b) => this.distanceMeters(lat, lng, a.lat, a.lng) - this.distanceMeters(lat, lng, b.lat, b.lng))
      .slice(0, 5)
  }

  private distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
}
```

**Checkpoint 5 ✅** : `GbfsService.getNearbyStations(48.87, 2.34, 400)` retourne les stations Vélib' proches.

---

### ✅ ÉTAPE 6 — RoutesService + Endpoint API (1h)

**6.1 DTO de recherche**
```typescript
// apps/backend/src/routes/dto/search-routes.dto.ts
import { IsNumber, IsDateString, IsOptional, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

export class SearchRoutesDto {
  @IsNumber() @Type(() => Number) fromLat: number
  @IsNumber() @Type(() => Number) fromLng: number
  @IsNumber() @Type(() => Number) toLat: number
  @IsNumber() @Type(() => Number) toLng: number
  @IsDateString() @IsOptional() departureTime?: string  // ISO 8601
  @IsBoolean() @IsOptional() pmrOnly?: boolean
}
```

**6.2 RoutesService — logique principale**
```typescript
// apps/backend/src/routes/routes.service.ts
@Injectable()
export class RoutesService {
  constructor(
    private navitia: NavitiaService,
    private gbfs: GbfsService,
    private co2: Co2Service,
    private cache: CacheService,
  ) {}

  async searchRoutes(dto: SearchRoutesDto) {
    const cacheKey = `routes:${dto.fromLat},${dto.fromLng}:${dto.toLat},${dto.toLng}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached

    // Appels parallèles : itinéraires TC + stations vélos proches
    const datetime = dto.departureTime
      ? new Date(dto.departureTime).toISOString().replace(/[-:]/g, '').split('.')[0]
      : new Date().toISOString().replace(/[-:]/g, '').split('.')[0]

    const [journeys, nearbyStations] = await Promise.all([
      this.navitia.getJourneys(
        { lat: dto.fromLat, lng: dto.fromLng },
        { lat: dto.toLat, lng: dto.toLng },
        datetime,
      ),
      this.gbfs.getNearbyStations(dto.fromLat, dto.fromLng),
    ])

    // Enrichir chaque journey avec le CO₂
    const enriched = journeys.map((journey: any) => ({
      id: crypto.randomUUID(),
      duration: journey.duration,
      departureTime: journey.departure_date_time,
      arrivalTime: journey.arrival_date_time,
      co2Kg: this.co2.calculateJourneyCo2(journey.sections),
      co2SavedKg: this.co2.calculateCo2Saved(
        this.co2.calculateJourneyCo2(journey.sections),
        journey.distances?.total / 1000 ?? 0,
      ),
      sections: this.formatSections(journey.sections),
      isPmrAccessible: this.checkPmrAccessibility(journey.sections),
    }))

    // Trier et sélectionner les 3 stratégies
    const result = {
      fast:       this.pickFastest(enriched),
      ecological: this.pickMostEcological(enriched),
      economic:   this.pickCheapest(enriched),
      nearbyBikeStations: nearbyStations,
    }

    await this.cache.set(cacheKey, result, 120) // TTL 2min
    return result
  }

  private pickFastest(journeys: any[]) {
    return journeys.sort((a, b) => a.duration - b.duration)[0] ?? null
  }

  private pickMostEcological(journeys: any[]) {
    return journeys.sort((a, b) => a.co2Kg - b.co2Kg)[0] ?? null
  }

  private pickCheapest(journeys: any[]) {
    // Proxy : moins de sections TC = moins cher
    return journeys.sort((a, b) => a.sections.length - b.sections.length)[0] ?? null
  }

  private checkPmrAccessibility(sections: any[]): boolean {
    return sections.every(
      (s) => s.type !== 'public_transport' || s.display_informations?.wheelchair_boarding !== false,
    )
  }

  private formatSections(sections: any[]) {
    return sections
      .filter((s) => s.type !== 'waiting')
      .map((s) => ({
        type: s.type,
        mode: s.display_informations?.commercial_mode ?? s.type,
        line: s.display_informations?.label,
        duration: s.duration,
        from: s.from?.stop_point?.name ?? s.from?.address?.name,
        to: s.to?.stop_point?.name ?? s.to?.address?.name,
        coordinates: s.geojson?.coordinates ?? [],
      }))
  }
}
```

**6.3 Endpoint**
```typescript
// POST /routes/search
// Body: SearchRoutesDto
// Guard: JwtAuthGuard
// Retourne: { fast, ecological, economic, nearbyBikeStations }
```

**Checkpoint 6 ✅** : `POST /routes/search` retourne les 3 stratégies avec CO₂. Testé avec Postman/Insomnia.

---

### ✅ ÉTAPE 7 — Frontend : Carte + Géolocalisation (1h)

**7.1 Hook de géolocalisation**
```typescript
// apps/frontend/src/hooks/useGeolocation.ts
'use client'
import { useState, useEffect } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ lat: null, lng: null, error: null, loading: true })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Géolocalisation non supportée', loading: false }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, loading: false }),
      (err) => setState((s) => ({ ...s, error: err.message, loading: false })),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  return state
}
```

**7.2 Composant MapView (Leaflet)**
Structure de fichiers :
```
apps/frontend/src/components/map/
├── MapView.tsx          # Composant Leaflet principal (client only)
├── RouteLayer.tsx       # Polylines colorées par mode de transport
├── StationMarkers.tsx   # Marqueurs stations GBFS
└── UserMarker.tsx       # Position de l'utilisateur
```

Couleurs des segments (design system) :
```typescript
const MODE_COLORS: Record<string, string> = {
  walking:          '#7C3AED',  // Marche — violet
  bicycle:          '#16A34A',  // Vélo — vert
  bss_rent:         '#16A34A',
  bus:              '#1D4ED8',  // Bus — bleu
  tram:             '#B45309',  // Tram — marron
  metro:            '#4F46E5',  // Métro — indigo
  rapidtransit:     '#4F46E5',
  default:          '#6B7280',
}
```

**7.3 Page Carte**
La page `/carte` contient :
- Barre de recherche en overlay sur la carte
- Filtres de mode (Vélo, Bus, Tram...) en chips horizontaux
- Carte Leaflet full-screen en dessous
- Bottom sheet "Accès rapide" (adresses favorites depuis le profil)

**7.4 Modale RGPD géolocalisation**
Au premier lancement, AVANT d'appeler `navigator.geolocation` :
```typescript
// Vérifier dans localStorage si le consentement a déjà été donné
const hasConsent = localStorage.getItem('geo_consent')
if (!hasConsent) {
  // Afficher la modale → bouton "Autoriser" → sauver 'geo_consent=true'
}
```

**Checkpoint 7 ✅** : La carte s'affiche, la position de l'utilisateur est marquée, la modale RGPD s'affiche au premier lancement.

---

### ✅ ÉTAPE 8 — Frontend : UI Résultats d'itinéraires (1h)

**8.1 Page Itinéraires**
La page `/itineraires` affiche :
- Carte en haut (40% de l'écran) avec le trajet surligné
- Fiche résultats en bas (60%) avec les 3 options

**8.2 Composant RouteCard**
```typescript
// Propriétés visuelles par stratégie (depuis les maquettes)
const STRATEGY_STYLE = {
  fast:       { label: 'Rapide',     color: '#B85C00', icon: '⚡' },
  ecological: { label: 'Écologique', color: '#2D7D46', icon: '🌿', recommended: true },
  economic:   { label: 'Économique', color: '#4F46E5', icon: '💶' },
}
```

La carte "Écologique" doit avoir :
- Bordure verte et badge "RECOMMANDÉ - LE PLUS VERT" (voir maquette écran 3)
- CO₂ évité en kg affiché
- Mention "Émissions estimées sur la base des facteurs ADEME"

**8.3 SectionPill (mode de transport)**
Chaque section d'itinéraire est représentée par une "pill" colorée avec l'icône du mode et la durée :
```
[🚶 3'] → [🚇 M2 11'] → [🚌 C4 7']
```

**8.4 Filtre PMR**
Le bouton "Accessible PMR" en haut filtre les résultats pour n'afficher que les itinéraires où `isPmrAccessible === true`.

**Checkpoint 8 ✅** : Flux complet — saisie destination → résultats avec 3 options → sélection → trajet affiché sur carte.

---

### ✅ ÉTAPE 9 — Tests Sprint 2 (45min)

**Tests unitaires backend :**
- `Co2Service.calculateJourneyCo2()` — plusieurs modes de transport
- `Co2Service.calculateCo2Saved()` — valeur positive et cas limite (trajet vélo = 0)
- `GbfsService` — mock HTTP, filtrage par distance
- `RoutesService.pickMostEcological()` — sélection correcte depuis une liste

**Tests d'intégration :**
- `POST /routes/search` sans JWT → 401
- `POST /routes/search` avec coordonnées invalides → 400 (validation DTO)
- `GET /gbfs/nearby?lat=...&lng=...` → retourne un tableau

**Checkpoint 9 ✅** : `pnpm test` passe. Couverture ≥ 65% sur les modules Sprint 2.

---

## Résumé des livrables Sprint 2

| Livrable | Description |
|----------|-------------|
| NavitiaService | Appel GTFS, format lon;lat, parsing journeys |
| Co2Service | Calcul CO₂ ADEME par mode de transport |
| GbfsService | Stations vélos GBFS avec cache Redis 30s |
| RoutesService | Agrégation + 3 stratégies + cache Redis 2min |
| `POST /routes/search` | Endpoint sécurisé JWT |
| MapView (Leaflet) | Carte SSR-safe, segments colorés par mode |
| Géolocalisation | Hook + modale consentement RGPD (C8) |
| Page Itinéraires | UI fidèle aux maquettes, 3 options, filtre PMR |
| Tests | ≥ 65% couverture modules Sprint 2 |

---

## Ce qui N'est PAS dans Sprint 2

- Le dashboard CO₂ personnel (Sprint 3)
- Le mode offline (Sprint 4)
- Les notifications de perturbations (hors périmètre v1)