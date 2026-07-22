# UrbanFlow Mobility

> PWA de mobilité urbaine multimodale — planification d'itinéraires vélo/bus/tram/métro/trottinette/marche et suivi de l'empreinte CO₂.

[![CI](https://github.com/Poutoo/urbanflow/actions/workflows/ci.yml/badge.svg)](https://github.com/Poutoo/urbanflow/actions/workflows/ci.yml)

Projet réalisé dans le cadre du titre professionnel **T6 CDSD — RNCP 36146** (DEHU Thibault).

---

## Fonctionnalités

Livré et vérifié dans le code (branche `main`) :

- **Authentification** — inscription/connexion email + mot de passe (hash argon2), connexion Google OAuth (NextAuth.js v5), JWT access (15 min) + refresh (7 jours) persistés en base
- **Profil utilisateur** — modes de transport préférés, stratégie par défaut, préférences d'accessibilité (PMR, sans escaliers), adresses domicile/travail, objectif CO₂ mensuel
- **Planificateur multimodal** — recherche d'itinéraires combinant IDFM PRIM (API Navitia, transports en commun GTFS Île-de-France), les disponibilités GBFS Vélib' Métropole en temps réel et le tracé cyclable réel via l'API Géovélo, avec **3 stratégies** au choix : rapide / écologique / économique
- **Autocomplétion de lieux** — recherche d'adresses et d'arrêts via IDFM PRIM
- **Carte interactive** — Leaflet / react-leaflet, tracés animés par mode, marqueurs de stations et de position
- **Dashboard CO₂** — résumé hebdomadaire, progression vers l'objectif mensuel, répartition des économies par mode de transport
- **Badge éco-mobile à 3 paliers** — Éco-débutant (5 kg CO₂ économisés cumulés), Éco-mobile (25 kg), Éco-héros (100 kg), recalculé automatiquement à chaque trajet enregistré
- **PWA installable** — manifest complet (icônes 72 à 512 px dont variantes maskable, captures d'écran), Service Worker (next-pwa/Workbox) avec 3 stratégies de cache : `StaleWhileRevalidate` (assets statiques, polices), `NetworkFirst` (données API, avec repli sur la dernière réponse en cas de coupure réseau), `CacheFirst` (tuiles de carte)

Non livré malgré une trace dans le code — voir [Limitations connues](#limitations-connues) :
- intégration météo (variable `OPENWEATHER_API_KEY` déclarée mais non consommée)
- mise en relation covoiturage réelle (le mode "covoiturage" existe comme préférence utilisateur, sans module de trajet associé)

---

## Stack technique

### Frontend (`apps/frontend`)
Next.js 14.2.18 (App Router, TypeScript strict) · Tailwind CSS 3.4 · Leaflet 1.9 + react-leaflet 4.2 · NextAuth.js 5.0.0-beta.25 · react-hook-form 7.53 + Zod 3.23 · SWR · next-pwa 5.6 (Workbox) · Axios

### Backend (`apps/backend`)
NestJS 10 (TypeScript strict) · Prisma 5.20 · Passport (JWT + Local) · argon2 · Helmet · `@nestjs/throttler` · `@nestjs/axios` · ioredis

### Données & infra
PostgreSQL 16 + PostGIS (Supabase) · Redis 7 · pnpm 10.33.0 + Turborepo 2 (monorepo) · Docker (déploiement backend) · Caddy (reverse proxy + TLS auto) · GitHub Actions (CI)

### Tests
Jest 29 + Testing Library + Supertest (backend et frontend) · Cypress 15.18 (E2E)

---

## Architecture

```mermaid
flowchart TD
    A["Client — navigateur / PWA installée"] -->|HTTPS| B["Frontend Next.js — Vercel<br/>urbanflow.poutoo.dev"]
    B -->|REST + JWT, HTTPS| C["Caddy — reverse proxy + TLS auto<br/>api-urbanflow.poutoo.dev"]
    C --> D["Backend NestJS — conteneur Docker (VPS)"]
    D --> E["Redis 7 — conteneur Docker<br/>cache itinéraires / GBFS"]
    D -->|Prisma, pooler PgBouncer :6543| F["Supabase PostgreSQL 16 + PostGIS<br/>eu-west-3"]
    D --> G["IDFM PRIM — API Navitia (GTFS)"]
    D --> H["GBFS Vélib' Métropole"]
    D --> I["Géovélo — tracé cyclable"]
```

Backend, Redis et Caddy sont orchestrés ensemble sur le VPS via `docker-compose.prod.yml` ; le frontend est déployé séparément sur Vercel. Les migrations Prisma utilisent une connexion directe dédiée (port 5432) car le pooler transactionnel (port 6543) ne supporte pas les prepared statements requis par `prisma migrate`.

---

## Prérequis

- **Node.js ≥ 20** (image Docker de build/runtime : `node:20-bookworm-slim`)
- **pnpm 10.33.0** (`packageManager` figé dans `package.json`, activable via `corepack enable`)
- **Docker** + **Docker Compose** (services locaux Postgres/PostGIS + Redis)

---

## Installation locale

```bash
git clone <url-du-repo>
cd urbanflow/urbanflow-mobility
pnpm install
```

Copier les fichiers d'exemple d'environnement puis renseigner les clés (voir [Variables d'environnement](#variables-denvironnement)) :

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

Démarrer PostgreSQL/PostGIS et Redis en local (`docker-compose.yml` expose Postgres sur le port hôte **5433**, pas 5432) :

```bash
docker-compose up -d
```

Pour un environnement 100 % local (hors Supabase), pointer dans `apps/backend/.env` :
```env
DATABASE_URL="postgresql://urbanflow:urbanflow_dev@localhost:5433/urbanflow"
DIRECT_URL="postgresql://urbanflow:urbanflow_dev@localhost:5433/urbanflow"
REDIS_URL="redis://localhost:6379"
```

Appliquer les migrations et générer le client Prisma :

```bash
pnpm --filter backend prisma migrate dev
pnpm --filter backend prisma generate
```

Lancer le monorepo en développement (Turborepo lance les deux apps en parallèle) :

```bash
pnpm dev
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- Backend : [http://localhost:3001/api](http://localhost:3001/api) (préfixe global `/api`, port par défaut si `PORT` non défini)

### Commandes disponibles

```bash
pnpm dev             # turbo run dev — frontend + backend en parallèle
pnpm build           # turbo run build
pnpm lint            # turbo run lint
pnpm test            # turbo run test
pnpm test:coverage   # turbo run test:coverage

pnpm prisma:migrate  # pnpm --filter backend prisma migrate dev
pnpm prisma:generate # pnpm --filter backend prisma generate
pnpm prisma:studio   # pnpm --filter backend prisma studio

# Depuis apps/frontend :
pnpm cy:open         # ouvre Cypress en mode interactif
pnpm test:e2e        # lance les specs Cypress en mode headless
```

### Variables d'environnement

**Backend — `apps/backend/.env`** (voir `.env.example`) : `DATABASE_URL`, `DIRECT_URL` (connexion directe requise par `prisma migrate`), `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `NAVITIA_BASE_URL` (endpoint IDFM PRIM), `NAVITIA_API_KEY`, `OPENWEATHER_API_KEY` (déclarée, non utilisée par le code actuel), `PORT`, `NODE_ENV`, `CORS_ORIGIN`.

**Frontend — `apps/frontend/.env.local`** (voir `.env.example`) : `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_API_URL`.

> Les variables préfixées `NEXT_PUBLIC_` sont exposées côté navigateur — n'y placer aucun secret.

---

## Tests

```bash
pnpm --filter backend test:coverage    # unitaire + intégration (Jest + Supertest)
pnpm --filter frontend test:coverage   # composants (Jest + Testing Library)
pnpm --filter frontend test:e2e        # end-to-end (Cypress)
```

Résultats mesurés le 2026-07-15 sur `main` (commit `ba1560d`) :

| Suite | Résultat | Couverture lignes | Seuil configuré |
|---|---|---|---|
| Backend (Jest) | 137 tests / 14 suites — tous passent | 77,12 % | 60 % — respecté |
| Frontend (Jest) | 9 tests / 3 suites — tous passent | 9,16 % | 60 % — **non respecté**, le run échoue sur le seuil |
| Frontend (Cypress) | 4 specs présentes | — | non ré-exécutées lors de cette vérification |

**Limite connue et assumée** : la couverture unitaire frontend est très faible — la quasi-totalité des composants (carte, cartes d'itinéraires, badge CO₂, dashboard) sont à 0 % de couverture Jest. La stratégie de test reporte la validation de ces flux sur les **4 specs Cypress** (`apps/frontend/cypress/e2e/`) :

- `01-inscription.cy.ts` — inscription email/password + parcours Google mocké
- `02-connexion.cy.ts` — connexion
- `03-recherche-itineraire.cy.ts` — recherche multimodale + sélection de stratégie
- `04-co2-badge.cy.ts` — enregistrement d'un trajet, dashboard CO₂ et badge éco-mobile

Ces specs n'ont pas été rejouées dans le cadre de cette vérification (elles nécessitent un backend actif, une base de données et des clés d'API tierces) — à relancer via `pnpm --filter frontend test:e2e` pour obtenir un rapport pass/fail à jour.

---

## Déploiement

- **Frontend** : Vercel, domaine `urbanflow.poutoo.dev`
- **Backend** : conteneurisé (`apps/backend/Dockerfile`, build multi-stage Node 20) et exécuté sur un VPS via `docker-compose.prod.yml` (services `backend` + `redis`), derrière **Caddy** qui gère le reverse proxy et le TLS automatique sur `api-urbanflow.poutoo.dev` (`Caddyfile` à la racine du monorepo)
- **Base de données** : Supabase PostgreSQL 16 + PostGIS (projet `urbanflow`, région `eu-west-3`) — connexion poolée (PgBouncer, port 6543) au runtime, connexion directe (port 5432) réservée aux migrations Prisma

Il n'existe pas de dossier `deploy/` séparé : toute la configuration de production (`Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`) vit à la racine de `urbanflow-mobility/`.

### Résilience et auto-guérison

Les 3 services (`backend`, `redis`, `caddy`) ont `restart: unless-stopped` : si un conteneur **crashe** (process tué, exit code non-zero), Docker le relance automatiquement. Testé en conditions réelles : un `SIGKILL` envoyé directement au process (hors API `docker kill`/`docker stop`, qui marquent le conteneur comme arrêté volontairement et désactivent le restart) déclenche bien un redémarrage automatique en quelques secondes.

Le service `backend` a en plus un **healthcheck Docker** (`GET /api/health`, toutes les 30s) qui interroge Prisma (`SELECT 1`) pour détecter un process vivant mais qui ne répond plus (connexion DB perdue, deadlock). `/api/auth/me` a été écarté : sans token, `JwtAuthGuard` répond 401 avant même d'atteindre Prisma — vérifié en local en coupant Postgres, le conteneur restait "healthy". `caddy` a `depends_on: backend: condition: service_healthy`, donc il n'est démarré qu'une fois le backend réellement prêt (pas juste lancé).

**Point important, vérifié en local** : un healthcheck qui échoue marque le conteneur `unhealthy`, mais **Docker Compose ne redémarre pas un conteneur unhealthy** — seul un crash (exit) déclenche `restart: unless-stopped`. Confirmé en coupant Postgres : après 3 échecs consécutifs (~90s), le backend passait à `unhealthy` et y restait indéfiniment (`RestartCount` figé à 0), sans jamais redémarrer tout seul. Il est revenu `healthy` de lui-même dès que Postgres a été relancé (pas de restart nécessaire pour un problème transitoire), mais rien ne force un restart si le process reste bloqué (deadlock, event loop figé). **Un mécanisme supplémentaire est donc nécessaire** pour ce cas (non implémenté ici) — par exemple un cron sur le VPS qui vérifie `docker inspect --format='{{.State.Health.Status}}' backend` et fait `docker restart` après N échecs, ou un sidecar dédié (ex. `willfarrell/autoheal`).

---

## Structure du monorepo

```
urbanflow/
├── urbanflow-mobility/               # Racine pnpm + Turborepo
│   ├── apps/
│   │   ├── frontend/                 # Next.js 14 (App Router)
│   │   │   ├── cypress/              # Specs E2E (e2e/, fixtures/, support/)
│   │   │   ├── public/               # manifest.json, icônes PWA, tuiles Leaflet
│   │   │   └── src/
│   │   │       ├── app/
│   │   │       │   ├── (auth)/       # login, register
│   │   │       │   └── (app)/        # carte, itineraires, empreinte, profil
│   │   │       ├── components/       # auth, layout, map, profile, pwa, routes, ui
│   │   │       ├── hooks/
│   │   │       └── lib/
│   │   └── backend/                  # NestJS
│   │       ├── prisma/
│   │       │   ├── schema.prisma     # User, Account, Session, UserProfile, SavedRoute, Co2Record
│   │       │   └── migrations/
│   │       ├── Dockerfile
│   │       └── src/
│   │           ├── auth/             # register, login, refresh, logout, me + guards JWT/Local
│   │           ├── users/            # profil (préférences, adresses)
│   │           ├── routes/           # agrégation des 3 stratégies d'itinéraire
│   │           ├── navitia/          # adapter IDFM PRIM (GTFS)
│   │           ├── gbfs/             # adapter Vélib' Métropole + cache Redis
│   │           ├── geovelo/          # tracé cyclable réel
│   │           ├── places/           # autocomplétion de lieux
│   │           ├── co2/              # calcul CO₂ + dashboard + badge éco-mobile
│   │           ├── cache/            # wrapper Redis (ioredis)
│   │           └── prisma/           # PrismaService
│   ├── packages/
│   │   ├── types/                    # interfaces TypeScript partagées
│   │   └── config/                   # config Prettier/tsconfig partagée
│   ├── docker-compose.yml            # Postgres/PostGIS + Redis (dev local)
│   ├── docker-compose.prod.yml       # backend + Redis + Caddy (production, VPS)
│   ├── Caddyfile
│   └── turbo.json
├── docs/
│   ├── maquettes/                    # maquettes Hi-Fi (PNG)
│   └── CONTEXT.md, SPRINT-1.md, SPRINT-2.md, SPRINT-3.md
└── README.md
```

---

## Limitations connues

- Couverture de tests unitaires Jest côté frontend très faible (9,16 % de lignes au 2026-07-15, seuil configuré à 60 % non atteint) — la validation de ces flux repose sur les tests E2E Cypress plutôt que sur des tests de composants
- La variable `OPENWEATHER_API_KEY` est déclarée dans `apps/backend/.env.example` mais n'est référencée par aucun service du code actuel : l'intégration météo n'est pas implémentée
- Le mode de transport "covoiturage" est sélectionnable comme préférence utilisateur (type `TransportMode`, sélecteur UI) mais aucun module de mise en relation ou de calcul d'itinéraire covoiturage n'existe
- Aucun score Lighthouse n'est committé dans le repo au moment de la rédaction de ce README — à mesurer et documenter séparément si besoin pour la soutenance
- Aucun fichier `LICENSE` n'est présent dans le repo

---

## Licence & auteur

Aucune licence n'est déclarée dans ce dépôt.

Projet réalisé par **DEHU Thibault** dans le cadre du titre professionnel **T6 Concepteur Développeur de Solutions Digitales (RNCP 36146)**.
