# Sprint 1 — Setup + Authentification

> **Objectif** : Mettre en place le monorepo complet et implémenter F1 (Authentification) de bout en bout.  
> **Durée estimée** : 3-4 jours de développement  
> **Résultat attendu** : Un utilisateur peut s'inscrire, se connecter via Google ou email/password, et voir son profil.

---

## Étapes à suivre dans l'ordre (NE PAS SAUTER D'ÉTAPE)

### ✅ ÉTAPE 1 — Setup du monorepo (1-2h)

**1.1 Initialiser le workspace pnpm + Turborepo**
```bash
mkdir urbanflow-mobility && cd urbanflow-mobility
pnpm init
pnpm add -D turbo
```

**1.2 Créer la structure des dossiers**
```
urbanflow-mobility/
├── apps/
│   ├── frontend/
│   └── backend/
├── packages/
│   ├── types/
│   └── config/
├── docs/
│   └── maquettes/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**1.3 Docker Compose pour le développement local**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: urbanflow
      POSTGRES_USER: urbanflow
      POSTGRES_PASSWORD: urbanflow_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

**1.4 Initialiser le frontend Next.js**
```bash
cd apps
pnpm create next-app@latest frontend --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
```

**1.5 Initialiser le backend NestJS**
```bash
pnpm add -g @nestjs/cli
nest new backend --package-manager pnpm --language typescript
```

**1.6 Configurer turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "outputs": [".next/**", "dist/**"]
    },
    "lint": {},
    "test": {}
  }
}
```

**Checkpoint 1 ✅** : `pnpm dev` démarre les deux apps sans erreur.

---

### ✅ ÉTAPE 2 — Schéma de base de données (1h)

**2.1 Installer Prisma dans le backend**
```bash
cd apps/backend
pnpm add @prisma/client
pnpm add -D prisma
pnpm prisma init
```

**2.2 Schéma Prisma complet pour Sprint 1**

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  avatarUrl     String?
  passwordHash  String?   // null si OAuth uniquement
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  accounts      Account[]
  sessions      Session[]
  profile       UserProfile?
  routes        SavedRoute[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String  // "google", "email"
  providerAccountId String
  accessToken       String? @db.Text
  refreshToken      String? @db.Text
  expiresAt         Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  refreshToken String   @unique @db.Text
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model UserProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  preferredModes    String[] // ["velo", "bus", "tram", "metro", "marche"]
  priorityMode      String   @default("ecological") // "fast", "ecological", "economic"
  pmrEnabled        Boolean  @default(false)
  noStairsEnabled   Boolean  @default(false)
  darkModeEnabled   Boolean  @default(false)
  homeAddress       String?
  homeCoordinates   Json?    // { lat: number, lng: number }
  workAddress       String?
  workCoordinates   Json?
  co2Goal           Float    @default(40.0) // kg CO₂ évité par mois
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model SavedRoute {
  id        String   @id @default(cuid())
  userId    String
  name      String
  from      Json     // { address: string, lat: number, lng: number }
  to        Json
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("saved_routes")
}
```

**2.3 Créer et appliquer la migration**
```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

**Checkpoint 2 ✅** : `pnpm prisma studio` montre les tables créées.

---

### ✅ ÉTAPE 3 — Backend NestJS — Module Auth (2-3h)

**3.1 Installer les dépendances**
```bash
cd apps/backend
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
pnpm add argon2 class-validator class-transformer
pnpm add @nestjs/config @nestjs/throttler
pnpm add helmet
pnpm add -D @types/passport-jwt @types/passport-local
```

**3.2 Structure du module Auth**
```
apps/backend/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── local.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── local-auth.guard.ts
│   └── dto/
│       ├── register.dto.ts
│       ├── login.dto.ts
│       └── auth-response.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── dto/
│       └── update-profile.dto.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── app.module.ts
```

**3.3 Endpoints à créer**

```
POST /auth/register       — Inscription email/password
POST /auth/login          — Connexion email/password
POST /auth/google         — Connexion OAuth Google (token exchange)
POST /auth/refresh        — Rafraîchir le token JWT
POST /auth/logout         — Invalider le refresh token
GET  /auth/me             — Profil de l'utilisateur connecté (JWT guard)
PUT  /users/profile       — Mettre à jour le profil (JWT guard)
```

**3.4 Règles de sécurité obligatoires**
- Hashing avec `argon2.hash()` (pas bcrypt)
- JWT access token : `expiresIn: '15m'`
- JWT refresh token : `expiresIn: '7d'` stocké en BDD (table sessions)
- Rate limiting : 10 requêtes/minute sur les endpoints auth
- Helmet.js activé sur l'app NestJS
- Validation Zod/class-validator sur tous les DTO
- Pas de données sensibles dans les JWT payloads (juste userId + email)

**3.5 Format des réponses**

```typescript
// Succès auth
{
  accessToken: string,   // JWT 15min
  refreshToken: string,  // JWT 7j
  user: {
    id: string,
    email: string,
    name: string | null,
    avatarUrl: string | null
  }
}

// Erreur
{
  statusCode: number,
  message: string,
  error: string
}
```

**Checkpoint 3 ✅** : Tests Supertest passent pour register, login, refresh, logout, me.

---

### ✅ ÉTAPE 4 — Frontend Next.js — Auth UI (2h)

**4.1 Installer les dépendances**
```bash
cd apps/frontend
pnpm add next-auth@5 @auth/prisma-adapter
pnpm add axios zod react-hook-form @hookform/resolvers
pnpm add next-pwa
```

**4.2 Pages à créer**

```
apps/frontend/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Écran connexion (voir maquette 01-connexion.png)
│   └── register/
│       └── page.tsx          # Écran inscription
├── (app)/
│   ├── layout.tsx            # Layout avec bottom nav
│   ├── page.tsx              # Redirect vers /carte
│   ├── carte/
│   │   └── page.tsx          # Placeholder (Sprint 2)
│   ├── itineraires/
│   │   └── page.tsx          # Placeholder (Sprint 2)
│   ├── empreinte/
│   │   └── page.tsx          # Placeholder (Sprint 3)
│   └── profil/
│       └── page.tsx          # Profil utilisateur (voir maquette 05-profil.png)
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts      # NextAuth handler
```

**4.3 Composants UI à créer**

```
apps/frontend/src/components/
├── ui/
│   ├── Button.tsx            # Bouton primaire/secondaire/ghost
│   ├── Input.tsx             # Input avec label et message d'erreur
│   ├── Badge.tsx             # Badge coloré (modes de transport)
│   └── Card.tsx              # Card avec shadow
├── auth/
│   ├── LoginForm.tsx         # Formulaire email/password
│   ├── GoogleButton.tsx      # Bouton "Continuer avec Google"
│   └── AuthLayout.tsx        # Layout header teal + formulaire
├── layout/
│   ├── BottomNav.tsx         # Navigation 4 onglets
│   └── AppLayout.tsx         # Layout principal (avec bottom nav)
└── profile/
    ├── TransportModes.tsx    # Sélection des modes préférés
    └── ProfileHeader.tsx     # Avatar + nom + badge Éco-mobile
```

**4.4 Design tokens CSS à appliquer**

Dans `apps/frontend/src/app/globals.css`, ajouter les variables CSS du design system (voir CONTEXT.md section 4).

**4.5 Référence visuelle**

Voir `docs/maquettes/01-connexion.png` pour l'écran de connexion :
- Header teal `#1A5F7A` avec logo + tagline
- Bouton Google en premier (prioritaire)
- Formulaire email/password en dessous
- CTA "Se connecter" en `#1A5F7A`
- Link "Inscrivez-vous" et CGU en bas

**Checkpoint 4 ✅** : Flux complet login → dashboard fonctionne. OAuth Google redirect fonctionne.

---

### ✅ ÉTAPE 5 — Tests (1h)

**5.1 Tests unitaires backend (Jest + Supertest)**

Couvrir minimum :
- `AuthService.register()` — email unique, hashing correct
- `AuthService.login()` — mauvais password retourne 401
- `AuthService.refreshToken()` — token invalide retourne 401
- `POST /auth/register` — validation des champs
- `GET /auth/me` — sans JWT retourne 401

**5.2 Tests frontend (Jest + Testing Library)**

Couvrir minimum :
- `LoginForm` — affiche les erreurs de validation
- `GoogleButton` — redirige vers OAuth
- `BottomNav` — onglet actif mis en évidence

**Checkpoint 5 ✅** : `pnpm test` passe sans erreur. Couverture ≥ 60%.

---

### ✅ ÉTAPE 6 — Configuration CI/CD (30min)

**6.1 GitHub Actions — workflow principal**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: urbanflow_test
          POSTGRES_USER: urbanflow
          POSTGRES_PASSWORD: urbanflow_test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**Checkpoint 6 ✅** : Le pipeline CI passe sur GitHub Actions.

---

## Résumé des livrables Sprint 1

| Livrable | Description |
|----------|-------------|
| Monorepo fonctionnel | pnpm + Turborepo, deux apps qui démarrent |
| Docker Compose | PostgreSQL 16 PostGIS + Redis 7 en local |
| Schéma Prisma | Users, Accounts, Sessions, UserProfile, SavedRoute |
| API Auth NestJS | Register, Login, OAuth Google, Refresh, Logout, Me |
| UI Auth Next.js | Écran connexion + inscription fidèles aux maquettes |
| Profil utilisateur | Lecture et modification du profil |
| Tests | ≥ 60% de couverture sur les modules auth |
| CI/CD | GitHub Actions opérationnel |

---

## Ce qui N'est PAS dans Sprint 1

- La carte Leaflet (Sprint 2)
- L'intégration Navitia.io (Sprint 2)
- Le calculateur CO₂ (Sprint 3)
- Les notifications push (Sprint 4)
- Le mode offline complet (Sprint 4)