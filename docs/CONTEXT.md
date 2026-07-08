# UrbanFlow Mobility — Contexte Projet pour Claude Code

> Ce fichier est ta référence principale. Lis-le intégralement avant toute action.

---

## 1. Description du projet

**UrbanFlow Mobility** est une plateforme PWA de mobilité urbaine intelligente.  
Elle permet aux citoyens de planifier des trajets multimodaux (vélo, bus, tram, métro, trottinette, marche) et de suivre leur empreinte CO₂.

Ce projet est un **titre professionnel T6 CDSD** (Concepteur Développeur de Solutions Digitales, RNCP 36146).  
L'évaluation inclut une revue de code en live devant un jury.

**Qualité du code = priorité absolue.**

---

## 2. Stack technique (décisions finales — ne pas modifier)

### Frontend
- **Next.js 14+** avec App Router (TypeScript strict)
- **Tailwind CSS** — design system via CSS variables
- **Leaflet.js** — cartographie (pas Google Maps, pas de coût)
- **next-pwa** (Workbox) — Service Worker + cache offline

### Backend
- **NestJS** (TypeScript strict)
- **Prisma ORM** — PostgreSQL 16 + PostGIS (géospatial)
- **Redis 7** — cache temps réel (disponibilités vélos/trams)
- **JWT** + **argon2** — authentification sécurisée

### Base de données
- **PostgreSQL 16** + extension **PostGIS**
- **Redis 7** — cache éphémère

### APIs externes
- **Navitia.io** — transports publics (GTFS)
- **GBFS** — vélos/trottinettes en libre-service
- **OpenWeatherMap** — météo
- **ADEME Base Carbone** — calcul empreinte CO₂

### Auth
- **NextAuth.js v5** — OAuth Google + email/password
- **argon2** — hashing des mots de passe (pas bcrypt)
- **JWT** — tokens d'accès

### Hébergement (dev/prod)
- **Vercel** — frontend
- **Railway** — backend NestJS
- **Supabase** — PostgreSQL + connexion Prisma
- **Upstash** — Redis managé

### CI/CD
- **GitHub Actions** — lint, tests, déploiement automatique

---

## 3. Structure du monorepo

```
urbanflow-mobility/
├── apps/
│   ├── frontend/          # Next.js 14 App
│   └── backend/           # NestJS API
├── packages/
│   ├── types/             # Types TypeScript partagés
│   └── config/            # Config partagée (ESLint, Prettier, etc.)
├── docs/
│   ├── maquettes/         # Captures d'écran High-Fi (référence UI)
│   ├── CONTEXT.md         # Ce fichier
│   ├── ARCHITECTURE.md    # Décisions d'architecture
│   └── SPRINT-1.md        # Plan Sprint 1
├── docker-compose.yml     # PostgreSQL + Redis en local
├── package.json           # Workspace root (pnpm)
└── turbo.json             # Turborepo config
```

---

## 4. Design System

### Palette de couleurs (WCAG 2.1 AA validée)

```css
:root {
  --color-primary: #1A5F7A;        /* Ocean Blue — éléments principaux */
  --color-secondary: #2D7D46;      /* Forest Green — éco, recommandations */
  --color-accent: #B85C00;         /* Amber — vitesse, urgence */
  --color-bg: #F7F9FC;             /* Off-White — fond général */
  --color-text: #0F1B2D;           /* Deep Navy — texte principal */
  --color-surface: #FFFFFF;        /* Blanc — cards, modales */
  --color-muted: #6B7280;          /* Gris — texte secondaire */

  /* Modes de transport */
  --color-velo: #16A34A;
  --color-bus: #1D4ED8;
  --color-trottinette: #0891B2;
  --color-marche: #7C3AED;
  --color-metro: #4F46E5;
  --color-tram: #B45309;
}
```

### Typographie
- Font principale : **Inter** (Google Fonts)
- Titres : `font-weight: 700`
- Corps : `font-weight: 400`
- Taille base : `16px` / `1rem`

### Espacements
- Système 4px : `4, 8, 12, 16, 24, 32, 48, 64px`
- Border radius : `8px` (cards), `24px` (boutons primaires), `999px` (badges)

---

## 5. Fonctionnalités à implémenter

### F1 — Authentification & Profil (Sprint 1)
- Inscription email/password (argon2 hashing)
- Connexion OAuth Google (NextAuth.js)
- JWT access token (15min) + refresh token (7j)
- Profil : modes de transport préférés, adresses favorites
- Gestion des préférences PMR (accessibilité)

### F2 — Planificateur multimodal (Sprint 2)
- Géolocalisation temps réel (GPS browser)
- Recherche itinéraire via Navitia.io
- Affichage carte Leaflet avec segments colorés par mode
- Filtres : Rapide / Écologique / Économique / PMR
- Cache Redis (TTL 2min) pour les résultats fréquents

### F3 — GBFS + Calculateur CO₂ (Sprint 3)
- Intégration GBFS (vélos, trottinettes en libre-service)
- Calcul empreinte CO₂ via ADEME Base Carbone
- Dashboard personnel CO₂ (graphique hebdo + objectif mensuel)
- Gamification : badge "Éco-mobile"

### PWA + Finalisation (Sprint 4)
- Service Worker avec stratégies de cache offline
- Lighthouse score ≥ 90 (performance, accessibilité, SEO, PWA)
- Tests E2E Cypress pour les flux critiques

---

## 6. Contraintes techniques (grille d'évaluation)

| Code | Contrainte | Impact |
|------|-----------|--------|
| C1 | PWA — installable, offline capable | Obligatoire |
| C2 | Responsive — mobile-first (375px+) | Obligatoire |
| C4 | OWASP Top 10 — sécurité | Obligatoire |
| C5 | Éco-conception RGESN | Évalué |
| C6 | Géolocalisation temps réel | Obligatoire |
| C7 | WCAG 2.1 AA — accessibilité | Obligatoire |
| C8 | RGPD — consentement géolocalisation | Obligatoire |
| C9 | Interopérabilité GTFS (Navitia) | Obligatoire |
| C10 | Performances offline | Obligatoire |
| C11 | Sécurité données | Obligatoire |
| C12 | Accessibilité PMR transports | Évalué |

---

## 7. Standards de code

### TypeScript
- Strict mode activé (`"strict": true` dans tsconfig)
- Pas de `any` — utiliser `unknown` si nécessaire
- Interfaces préférées aux types pour les objets
- Zod pour la validation des données entrantes

### Tests
- Jest + Testing Library (frontend)
- Jest + Supertest (backend NestJS)
- Cypress (E2E — Sprint 4)
- Couverture visée : 70% minimum

### Commits
- Format Conventional Commits : `feat:`, `fix:`, `chore:`, `test:`, `docs:`
- Pas de commits sur `main` directement — feature branches

### Linting
- ESLint avec règles TypeScript strict
- Prettier — `printWidth: 100`, `singleQuote: true`, `tabWidth: 2`

### Sécurité
- Helmet.js sur NestJS (headers HTTP)
- Rate limiting (throttler NestJS)
- Variables d'environnement via `.env` (jamais hardcoded)
- Validation de toutes les entrées utilisateur (Zod + class-validator)

---

## 8. Références visuelles

Les maquettes High-Fi se trouvent dans `docs/maquettes/` :
- `01-connexion.png` — Écran de connexion OAuth
- `02-carte.png` — Carte principale avec filtres
- `03-itineraires.png` — Résultats d'itinéraires
- `04-co2.png` — Dashboard empreinte CO₂
- `05-profil.png` — Profil utilisateur
- `06-parametres.png` — Paramètres accessibilité

---

## 9. Variables d'environnement requises

```env
# Backend NestJS
DATABASE_URL=postgresql://user:password@localhost:5432/urbanflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-super-secret-key
NAVITIA_API_KEY=your-navitia-key
OPENWEATHER_API_KEY=your-openweather-key

# Frontend Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-oauth-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MAPBOX_TOKEN=not-used-using-leaflet
```

---

## 10. Commandes utiles

```bash
# Démarrer l'environnement local
docker-compose up -d        # PostgreSQL + Redis
pnpm dev                    # Frontend + Backend en parallèle

# Base de données
pnpm prisma:migrate         # Appliquer les migrations
pnpm prisma:studio          # Ouvrir Prisma Studio

# Tests
pnpm test                   # Tous les tests
pnpm test:coverage          # Avec couverture
pnpm lint                   # ESLint sur tout le monorepo
```