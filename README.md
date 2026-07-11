# UrbanFlow Mobility

> Plateforme PWA de mobilité urbaine intelligente — planification multimodale & suivi CO₂

**Auteur :** DEHU Thibault — B3DEV — 2026  
**Titre professionnel T6 CDSD — RNCP 36146**

---

## Sommaire

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Architecture technique](#architecture-technique)
- [Structure du monorepo](#structure-du-monorepo)
- [Prérequis](#prérequis)
- [Installation & démarrage](#installation--démarrage)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes disponibles](#commandes-disponibles)
- [API Reference](#api-reference)
- [Design System](#design-system)
- [Base de données](#base-de-données)
- [Tests](#tests)
- [CI/CD](#cicd)
- [Conformité & accessibilité](#conformité--accessibilité)
- [Roadmap](#roadmap)
- [Conventions de contribution](#conventions-de-contribution)

---

## Présentation

**UrbanFlow Mobility** est une application web progressive (PWA) permettant aux citoyens de :

- **Planifier des trajets multimodaux** : vélo, bus, tram, métro, trottinette, marche à pied, en une seule interface
- **Visualiser les itinéraires** sur une carte interactive (Leaflet.js) avec des segments colorés par mode de transport
- **Suivre leur empreinte CO₂** en temps réel grâce aux facteurs d'émission ADEME Base Carbone
- **Accéder aux disponibilités** vélos et trottinettes en libre-service (flux GBFS)
- **Consulter les transports publics** via l'API Navitia.io (données GTFS)

L'application est conçue **mobile-first**, installable sur smartphone, et fonctionnelle hors-ligne pour les données mises en cache.

---

## Fonctionnalités

### Sprint 1 — Authentification & Profil `[Livré]`

| Fonctionnalité | Détail |
|---|---|
| Inscription email/password | Hashing argon2, validation Zod |
| Connexion OAuth Google | NextAuth.js v5 |
| JWT access + refresh token | Access 15 min / Refresh 7 jours (stocké en BDD) |
| Profil utilisateur | Modes préférés, adresses favorites, objectif CO₂ |
| Accessibilité PMR | Préférences sans escaliers, itinéraires filtrés |

### Sprint 2 — Planificateur multimodal `[Livré]`

| Fonctionnalité | Détail |
|---|---|
| Géolocalisation GPS | Consentement RGPD (C8), `navigator.geolocation` |
| Carte Leaflet interactive | Segments colorés par mode, marqueurs stations |
| Intégration Navitia.io | Requêtes GTFS, couverture Île-de-France |
| Disponibilités GBFS | Stations Vélib' en temps réel (TTL 30 s) |
| Calcul CO₂ ADEME | Facteurs par mode, CO₂ évité vs voiture solo |
| Cache Redis | Itinéraires (TTL 2 min), stations GBFS (TTL 30 s) |
| 3 stratégies d'itinéraire | Rapide / Écologique / Économique |
| Filtre PMR | Affichage des itinéraires accessibles uniquement |

### Sprint 3 — Dashboard CO₂ `[En cours]`

- Dashboard personnel CO₂ (graphique hebdomadaire + objectif mensuel)
- Gamification : badge "Éco-mobile"
- Historique des trajets sauvegardés

### Sprint 4 — PWA & Finalisation `[Planifié]`

- Service Worker (Workbox) : stratégies de cache offline
- Lighthouse score ≥ 90 (Performance, Accessibilité, SEO, PWA)
- Tests E2E Cypress sur les flux critiques

---

## Architecture technique

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                 │
│   Browser (PWA)  ·  Mobile (installé)  ·  Offline (SW cache)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    FRONTEND — Vercel                            │
│   Next.js 14  ·  App Router  ·  TypeScript strict              │
│   Tailwind CSS  ·  Leaflet.js  ·  NextAuth.js v5               │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / JWT
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND — Railway                            │
│   NestJS  ·  TypeScript strict  ·  Helmet  ·  Throttler        │
│   Passport JWT  ·  argon2  ·  class-validator                  │
└───────────┬──────────────────────────────┬──────────────────────┘
            │ Prisma ORM                   │ ioredis
┌───────────▼───────────┐    ┌─────────────▼────────────────────┐
│  Supabase PostgreSQL  │    │  Upstash Redis 7                 │
│  16 + PostGIS         │    │  Cache itinéraires & GBFS        │
└───────────────────────┘    └──────────────────────────────────┘

APIs externes :
  · Navitia.io   — transports publics (GTFS, couverture fr-idf)
  · GBFS          — vélos/trottinettes libre-service (Vélib')
  · ADEME         — facteurs d'émission CO₂ (Base Carbone)
  · OpenWeather   — météo (prévu Sprint 3)
```

### Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, Leaflet.js, NextAuth.js v5, react-hook-form, Zod |
| **Backend** | NestJS, TypeScript strict, Passport JWT, argon2, Helmet, Throttler, class-validator |
| **ORM / BDD** | Prisma 5, PostgreSQL 16 + PostGIS, Redis 7 |
| **Tests** | Jest 29, Testing Library, Supertest, (Cypress — Sprint 4) |
| **Build** | pnpm, Turborepo |
| **CI/CD** | GitHub Actions |
| **Hébergement** | Vercel (frontend), Railway (backend), Supabase (DB), Upstash (Redis) |

---

## Structure du monorepo

```
urbanflow/
├── urbanflow-mobility/              # Racine du monorepo pnpm + Turborepo
│   ├── apps/
│   │   ├── frontend/                # Next.js 14 App
│   │   │   └── src/
│   │   │       ├── app/             # App Router (pages, layouts, API routes)
│   │   │       │   ├── (auth)/      # Login / Register
│   │   │       │   └── (app)/       # Carte, Itinéraires, Empreinte, Profil
│   │   │       ├── components/
│   │   │       │   ├── ui/          # Button, Input, Badge, Card
│   │   │       │   ├── auth/        # LoginForm, GoogleButton, AuthLayout
│   │   │       │   ├── layout/      # BottomNav, AppLayout
│   │   │       │   ├── map/         # MapView, RouteLayer, StationMarkers, UserMarker
│   │   │       │   └── routes/      # RouteCard, RouteResultsPanel, SectionPill
│   │   │       ├── hooks/           # useGeolocation, ...
│   │   │       └── lib/             # auth.ts (NextAuth config), api.ts (Axios client)
│   │   └── backend/                 # NestJS API
│   │       ├── prisma/
│   │       │   └── schema.prisma    # Schéma BDD (User, Account, Session, UserProfile, SavedRoute)
│   │       └── src/
│   │           ├── auth/            # Register, login, refresh, logout, me + strategies JWT/Local
│   │           ├── users/           # Profil utilisateur (préférences, adresses)
│   │           ├── routes/          # Agrégation itinéraires + 3 stratégies
│   │           ├── navitia/         # Adapter API Navitia.io (GTFS)
│   │           ├── gbfs/            # Adapter flux GBFS (Vélib') + cache Redis
│   │           ├── co2/             # Calcul CO₂ ADEME Base Carbone
│   │           ├── cache/           # Wrapper Redis (ioredis, TTL configurable)
│   │           └── prisma/          # PrismaService + PrismaModule
│   ├── packages/
│   │   ├── types/                   # Interfaces TypeScript partagées (AuthUser, UserProfile…)
│   │   └── config/                  # Prettier, tsconfig partagés
│   ├── docker-compose.yml           # PostgreSQL 16 PostGIS + Redis 7 (dev local)
│   ├── turbo.json                   # Turborepo pipeline (dev, build, lint, test)
│   └── pnpm-workspace.yaml
├── docs/
│   ├── maquettes/                   # Maquettes High-Fi (PNG)
│   │   ├── 01-connexion.png
│   │   ├── 02-carte.png
│   │   ├── 03-itineraires.png
│   │   ├── 04-co2.png
│   │   ├── 05-profile.png
│   │   └── 06-parametres.png
│   ├── CONTEXT.md                   # Référence projet (stack, contraintes, design system)
│   ├── SPRINT-1.md                  # Plan détaillé Sprint 1
│   └── SPRINT-2.md                  # Plan détaillé Sprint 2
└── README.md
```

---

## Prérequis

| Outil | Version minimale |
|---|---|
| Node.js | 20 LTS |
| pnpm | 8+ |
| Docker & Docker Compose | 24+ |
| Git | 2.40+ |

---

## Installation & démarrage

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd urbanflow/urbanflow-mobility
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configurer les variables d'environnement

Copier les fichiers d'exemple et les renseigner (voir [Variables d'environnement](#variables-denvironnement)) :

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

### 4. Démarrer les services Docker (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 5. Appliquer les migrations Prisma

```bash
pnpm --filter backend prisma migrate dev
pnpm --filter backend prisma generate
```

### 6. Lancer le monorepo en mode développement

```bash
pnpm dev
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- Backend  : [http://localhost:3001/api](http://localhost:3001/api)

---

## Variables d'environnement

### Backend — `apps/backend/.env`

```env
# Base de données
DATABASE_URL=postgresql://urbanflow:urbanflow_dev@localhost:5432/urbanflow

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=votre-secret-min-32-caracteres
JWT_REFRESH_SECRET=un-autre-secret-min-32-caracteres
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# APIs externes
NAVITIA_API_KEY=votre-cle-navitia
NAVITIA_BASE_URL=https://api.navitia.io/v1
OPENWEATHER_API_KEY=votre-cle-openweather

# App
PORT=3001
NEXTAUTH_URL=http://localhost:3000
```

### Frontend — `apps/frontend/.env.local`

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-nextauth

# OAuth Google (console.cloud.google.com)
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret

# Backend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> Les variables préfixées `NEXT_PUBLIC_` sont exposées côté navigateur. Ne jamais y placer de secrets.

---

## Commandes disponibles

```bash
# Développement
pnpm dev                               # Frontend + Backend en parallèle (Turborepo)

# Tests
pnpm test                              # Tous les tests Jest
pnpm test:coverage                     # Avec rapport de couverture HTML + lcov

# Qualité de code
pnpm lint                              # ESLint sur tout le monorepo

# Build de production
pnpm build

# Base de données (depuis la racine du monorepo)
pnpm --filter backend prisma migrate dev   # Appliquer les migrations
pnpm --filter backend prisma generate      # Regénérer le client Prisma
pnpm --filter backend prisma studio        # Interface Prisma Studio

# Infrastructure locale
docker-compose up -d                   # Démarrer PostgreSQL + Redis
docker-compose down                    # Arrêter les services
```

---

## API Reference

Tous les endpoints sont préfixés `/api`. Les endpoints protégés requièrent le header :

```
Authorization: Bearer <accessToken>
```

### Authentification

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Non | Créer un compte email/password |
| `POST` | `/api/auth/login` | Non | Connexion email/password |
| `POST` | `/api/auth/google` | Non | Échange de token Google OAuth |
| `POST` | `/api/auth/refresh` | Non | Renouveler l'access token |
| `POST` | `/api/auth/logout` | Oui | Invalider le refresh token |
| `GET` | `/api/auth/me` | Oui | Profil de l'utilisateur connecté |

**Exemple — Inscription :**

```json
// POST /api/auth/register
{
  "email": "user@example.com",
  "password": "motdepasse123!",
  "name": "Jean Dupont"
}

// Réponse 201
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "clv1abc...",
    "email": "user@example.com",
    "name": "Jean Dupont",
    "avatarUrl": null
  }
}
```

### Profil utilisateur

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `PUT` | `/api/users/profile` | Oui | Mettre à jour les préférences de transport et d'accessibilité |

### Itinéraires

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/routes/search` | Oui | Recherche d'itinéraires (3 stratégies + stations GBFS à proximité) |

**Exemple — Recherche d'itinéraire :**

```json
// POST /api/routes/search
{
  "fromLat": 48.8566,
  "fromLng": 2.3522,
  "toLat": 48.8738,
  "toLng": 2.2950,
  "departureTime": "2026-06-30T08:30:00.000Z",
  "pmrOnly": false
}

// Réponse 200
{
  "fast":       { "duration": 1200, "co2Kg": 0.02, "co2SavedKg": 0.89, "sections": [...] },
  "ecological": { "duration": 1500, "co2Kg": 0.00, "co2SavedKg": 1.09, "sections": [...] },
  "economic":   { "duration": 1380, "co2Kg": 0.01, "co2SavedKg": 0.98, "sections": [...] },
  "nearbyBikeStations": [
    {
      "id": "10042",
      "name": "Rivoli - Louvre",
      "lat": 48.8601,
      "lng": 2.3477,
      "bikesAvailable": 8,
      "docksAvailable": 4
    }
  ]
}
```

**Sécurité :** les endpoints d'authentification sont limités à **10 requêtes/minute par IP** (NestJS Throttler).

---

## Design System

### Palette de couleurs (WCAG 2.1 AA validée)

| Token CSS | Valeur | Usage |
|---|---|---|
| `--color-primary` | `#1A5F7A` | Éléments principaux (boutons, liens) |
| `--color-secondary` | `#2D7D46` | Recommandations écologiques |
| `--color-accent` | `#B85C00` | Urgence, itinéraire rapide |
| `--color-bg` | `#F7F9FC` | Fond général |
| `--color-text` | `#0F1B2D` | Texte principal |
| `--color-surface` | `#FFFFFF` | Cards, modales |
| `--color-muted` | `#6B7280` | Texte secondaire |

### Couleurs par mode de transport

| Mode | Token | Valeur |
|---|---|---|
| Vélo / GBFS | `--color-velo` | `#16A34A` (vert) |
| Bus | `--color-bus` | `#1D4ED8` (bleu) |
| Trottinette | `--color-trottinette` | `#0891B2` (cyan) |
| Marche | `--color-marche` | `#7C3AED` (violet) |
| Métro | `--color-metro` | `#4F46E5` (indigo) |
| Tram | `--color-tram` | `#B45309` (marron) |

### Typographie & espacements

- **Police** : Inter (Google Fonts) — Regular 400 (corps) / Bold 700 (titres)
- **Taille de base** : `16px`
- **Système d'espacement** : multiples de 4 px → `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`
- **Border-radius** : `8px` (cards), `24px` (boutons primaires), `999px` (badges/pills)

---

## Base de données

Schéma Prisma — PostgreSQL 16 + PostGIS

```
users
  ├── accounts          (comptes OAuth liés, ex. Google)
  ├── sessions          (refresh tokens actifs, 1 par connexion)
  ├── profile           (UserProfile — modes préférés, adresses, objectif CO₂)
  └── routes            (SavedRoute — trajets favoris, from/to en JSON)
```

| Modèle | Table | Description |
|---|---|---|
| `User` | `users` | Compte utilisateur (email, `passwordHash` nullable si OAuth uniquement) |
| `Account` | `accounts` | Provider OAuth lié (`provider`, `providerAccountId`) |
| `Session` | `sessions` | Refresh tokens avec expiration et métadonnées (userAgent, IP) |
| `UserProfile` | `user_profiles` | Préférences mobilité, adresses home/work, accessibilité PMR, objectif CO₂ |
| `SavedRoute` | `saved_routes` | Trajets favoris enregistrés par l'utilisateur |

Les IDs utilisent le format **cuid** (`@default(cuid())`). Les suppressions sont en cascade depuis `User`.

---

## Tests

```bash
pnpm test             # Tous les tests (Jest)
pnpm test:coverage    # Rapport de couverture (lcov + texte)
```

### Couverture cible

| Module | Type | Objectif |
|---|---|---|
| `auth` (backend) | Unitaire + intégration Supertest | ≥ 65 % |
| `co2` | Unitaire | ≥ 65 % |
| `gbfs` | Unitaire (mock HTTP) | ≥ 65 % |
| `routes` | Unitaire + intégration | ≥ 65 % |
| `LoginForm` (frontend) | Composant Testing Library | ≥ 60 % |
| `BottomNav` | Composant | ≥ 60 % |

### Cas couverts (sélection)

- `AuthService.register()` — email déjà utilisé → 409, hashing argon2
- `AuthService.login()` — mot de passe incorrect → 401
- `AuthService.refreshToken()` — token expiré/invalide → 401
- `Co2Service.calculateJourneyCo2()` — multi-modes, vélo (CO₂ = 0), cas limite
- `GbfsService.getNearbyStations()` — filtrage par distance (formule haversine)
- `RoutesService.pickMostEcological()` — sélection correcte depuis une liste
- `POST /routes/search` sans JWT → 401
- `POST /routes/search` avec DTO invalide → 400

---

## CI/CD

Le pipeline GitHub Actions se déclenche sur chaque push vers `main` ou `develop`, et sur toute Pull Request ciblant `main`.

```
lint → test → build
```

**Services Docker intégrés :** PostgreSQL 16 PostGIS + Redis 7  
**Environnement :** Node.js 20 + pnpm 8 (cache activé)

### Stratégie de branches

| Branche | Usage |
|---|---|
| `main` | Production — protégée, merge via PR uniquement |
| `develop` | Intégration continue |
| `feat/*` | Feature branches par sprint (ex. `feat/sprint-2-planner`) |

---

## Conformité & accessibilité

| Code | Contrainte | Statut |
|---|---|---|
| C1 | PWA — installable, offline capable | Sprint 4 |
| C2 | Responsive — mobile-first (375px+) | En cours |
| C4 | OWASP Top 10 | Implémenté (Helmet, rate limiting, argon2, validation) |
| C5 | Éco-conception RGESN | En cours |
| C6 | Géolocalisation temps réel | Sprint 2 |
| C7 | WCAG 2.1 AA | Palette validée, aria-labels en cours |
| C8 | RGPD — consentement géolocalisation | Sprint 2 (modale consent) |
| C9 | Interopérabilité GTFS (Navitia.io) | Sprint 2 |
| C10 | Performances offline | Sprint 4 (Service Worker) |
| C11 | Sécurité données | Implémenté (JWT, argon2, sessions BDD, CORS) |
| C12 | Accessibilité PMR transports | Sprint 2 (filtre PMR sur itinéraires) |

---

## Roadmap

| Sprint | Objectif | Statut |
|---|---|---|
| Sprint 1 | Auth email/password + Google OAuth, profil utilisateur, CI/CD | Livré |
| Sprint 2 | Carte Leaflet, Navitia.io, GBFS, calcul CO₂, 3 stratégies | Livré |
| Sprint 3 | Dashboard CO₂ personnel, historique trajets, gamification | En cours |
| Sprint 4 | PWA offline, Service Worker, Lighthouse ≥ 90, tests E2E Cypress | Planifié |

---

## Conventions de contribution

### Format des commits — Conventional Commits

```
feat:     Nouvelle fonctionnalité
fix:      Correction de bug
chore:    Outillage, dépendances, configuration
test:     Ajout ou modification de tests
docs:     Documentation uniquement
refactor: Refactoring sans changement de comportement
```

### Règles

- Pas de commit direct sur `main` — toujours passer par une feature branch et une PR
- Toute PR doit passer le pipeline CI complet (lint + tests + build) avant le merge
- TypeScript strict — pas de `any`, utiliser `unknown` si le type est inconnu
- Prettier configuré : `printWidth: 100`, `singleQuote: true`, `tabWidth: 2`
- Les fichiers `.env` ne sont jamais committés (listés dans `.gitignore`)

---

*Projet réalisé dans le cadre du titre professionnel T6 CDSD — RNCP 36146.*
