# Audit de sécurité — UrbanFlow Mobility

**Date de l'audit :** 2026-08-28
**Périmètre :** dépôt `urbanflow-mobility` (monorepo pnpm/Turborepo), frontend Next.js (Vercel) + backend NestJS/Prisma (VPS Docker), base de données PostgreSQL hébergée sur Supabase.
**Méthode :** revue statique du code source, lecture de la configuration de déploiement (Dockerfile, Caddyfile, CI), interrogation directe du projet Supabase réel via l'API Advisor (RLS), et lecture de la configuration Vercel réelle (protections de déploiement). `pnpm audit` exécuté sur les dépendances de production du monorepo.
**Aucun correctif n'a été appliqué.** Ce document liste les constats et propose des correctifs à valider et appliquer par l'équipe.

---

## ⚠️ Écarts entre le brief d'audit et le dépôt réel — à lire en premier

Le brief demandé décrit une architecture "Next.js 15 + Supabase (client direct)". Ce n'est **pas** ce que le dépôt contient réellement. Constats vérifiés :

1. **Ce n'est pas une app Supabase classique.** Le backend est un service **NestJS séparé** (`apps/backend`) qui parle à PostgreSQL via **Prisma** (connexion SQL directe par pooler PgBouncer), pas via le SDK `@supabase/supabase-js` ni l'API REST/PostgREST de Supabase. Il n'y a **aucune clé Supabase (`anon`/`service_role`) dans le code du frontend ou du backend** — confirmé par grep exhaustif sur les deux apps. Supabase n'est ici qu'un **hébergeur PostgreSQL managé** (voir `docs/CONTEXT.md` et `README.md`).
   Conséquence importante : les policies RLS Supabase ne protègent **pas** l'application elle-même (Prisma s'y connecte avec le rôle `postgres`, qui bypass RLS par défaut sous PostgreSQL/Supabase). Mais — et c'est le cœur du **Constat CRIT-01** ci-dessous — RLS protège l'**API REST PostgREST que Supabase expose automatiquement en parallèle**, que l'app l'utilise ou non.
2. **Version réelle de Next.js : `14.2.18`**, pas Next.js 15 (`apps/frontend/package.json`).
3. **Aucune fonctionnalité "mini-jeux" ni "classement" n'existe dans le dépôt** (recherche exhaustive sur "classement", "leaderboard", "mini-jeu", "score" côté code — aucune correspondance fonctionnelle). Le système de gamification réel est le **badge éco-mobile / CO₂ cumulé** (`user_profiles.totalCo2SavedKg`, `badgeLevel`, table `co2_records`) — c'est l'équivalent le plus proche d'un "score" dans cette app, et il est audité comme tel (voir MED-01).

Le reste de ce rapport s'appuie sur le code et l'infrastructure **réels**.

---

## Récapitulatif par sévérité

| ID | Titre | Sévérité |
|----|-------|----------|
| CRIT-01 | RLS désactivée sur toutes les tables Supabase exposées publiquement (vérifié en direct) | **Critique** |
| CRIT-02 | `next-auth`/`@auth/core` : CVE critiques activement exploitables (fail-open, bypass email) | **Critique** |
| CRIT-03 | `next@14.2.18` : CVE critique de bypass d'autorisation Middleware | **Critique** |
| HIGH-01 | Rate limiting configuré mais **jamais appliqué** (ThrottlerGuard non enregistré) | Élevée |
| HIGH-02 | Refresh tokens stockés **en clair** en base | Élevée |
| HIGH-03 | Aucun header de sécurité HTTP sur le frontend (CSP, HSTS, X-Frame-Options, etc.) | Élevée |
| HIGH-04 | Dépendances backend vulnérables (multer, lodash, form-data, axios) | Élevée |
| MED-01 | `POST /co2/record` accepte des valeurs de CO₂ non recalculées côté serveur (falsification de score possible) | Moyenne |
| MED-02 | `GET /places` public, non authentifié et non limité en débit (épuisement de quota API payante) | Moyenne |
| MED-03 | Stratégie JWT sans restriction explicite d'algorithme | Moyenne |
| MED-04 | Access token backend exposé au JS client via `useSession()` | Moyenne |
| LOW-01 | Énumération d'emails via `POST /auth/register` (409) | Faible |
| LOW-02 | `LoginDto.password` sans longueur maximale | Faible |
| LOW-03 | `withCredentials: true` inutile sur le client axios frontend | Faible |
| INFO | Points vérifiés **sans faille** (à noter pour ne pas les ré-auditer) | — |

---

## CRITIQUE

### CRIT-01 — Row Level Security désactivée sur toutes les tables Supabase publiques

**Preuve (vérification live, pas une supposition) :** interrogation de l'Advisor de sécurité Supabase sur le projet réel `urbanflow` (réf. `qmsummwbnckvuqrneeui`, région `eu-west-3`) :

```
ERROR — rls_disabled_in_public — Table `public.users` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public.accounts` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public.sessions` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public.user_profiles` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public.saved_routes` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public.co2_records` is public, but RLS has not been enabled.
ERROR — rls_disabled_in_public — Table `public._prisma_migrations` is public, but RLS has not been enabled.
```

**Pourquoi c'est critique :** tout projet Supabase expose automatiquement chaque table du schéma `public` via son API REST PostgREST (`https://<project-ref>.supabase.co/rest/v1/<table>`), **indépendamment du fait que l'application utilise le SDK Supabase ou non**. Sans RLS, cette API est protégée uniquement par la connaissance de la clé `anon` du projet — une clé conçue pour être *publique* dans l'écosystème Supabase, la sécurité réelle devant venir des policies RLS. Ici, RLS étant désactivée sur les 7 tables :
- `public.users` expose `passwordHash` (hash argon2) et l'email de chaque utilisateur en lecture/écriture pour quiconque dispose de la clé `anon`.
- `public.sessions` expose `refreshToken` **en clair** (voir aussi HIGH-02) et `ipAddress`.
- `public.accounts` expose les identifiants de comptes OAuth Google liés.

**Scénario d'exploitation concret (chaîné avec HIGH-02) :**
1. Un attaquant obtient la clé `anon` du projet Supabase (ex. si elle est un jour ajoutée à un client, à une variable d'env exposée, ou simplement communiquée par erreur — elle n'est *actuellement* pas trouvée dans le code, ce qui limite le risque *aujourd'hui*, mais RLS reste la seule barrière si cela change).
2. `GET https://qmsummwbnckvuqrneeui.supabase.co/rest/v1/sessions?select=refreshToken,userId` avec le header `apikey: <anon-key>` retourne tous les refresh tokens en clair.
3. `POST https://api-urbanflow.poutoo.dev/api/auth/refresh` avec ce token retourne un `accessToken` JWT valide pour l'utilisateur ciblé → prise de contrôle de compte complète, sans jamais avoir eu le mot de passe.

**Important — ce correctif ne casse pas l'application :** Prisma se connecte avec le rôle `postgres` (utilisateur propriétaire des tables), qui **bypass RLS par défaut** sous PostgreSQL/Supabase. Activer RLS sans aucune policy bloque uniquement les accès via `anon`/`authenticated` (PostgREST), donc uniquement un chemin que l'app n'utilise pas.

**Correctif proposé** (à exécuter dans le SQL Editor du dashboard Supabase, ou via une migration Prisma dédiée) :
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co2_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
```
Ne pas ajouter de policy (deny-by-default) : c'est le comportement voulu puisque seul Prisma (rôle `postgres`) doit accéder à ces tables. À valider par un test de non-régression complet de l'app après application (register/login/refresh/profil/CO₂) avant de considérer le correctif définitif.

**Fichiers concernés :** infrastructure Supabase (hors dépôt) ; `urbanflow-mobility/apps/backend/prisma/schema.prisma` (documente les tables).

---

### CRIT-02 — `next-auth` / `@auth/core` : CVE critiques dans la version installée

**Preuve (`pnpm-lock.yaml`, versions résolues) :** `next-auth@5.0.0-beta.31`, `@auth/core@0.41.2` — pile exactement dans la plage vulnérable de plusieurs avisories, confirmées par `pnpm audit --prod` :

- **CRITIQUE** — *Auth.js: Configuration errors can cause existence-based auth checks to fail open* (objet `auth` peuplé même en cas d'erreur de config) — plages vulnérables `>=5.0.0-beta.0 <=5.0.0-beta.31` — [GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279)
- **CRITIQUE** — *Auth.js: Email normalizer validates the address before Unicode normalization, allowing a homoglyph @ bypass* — mêmes plages
- **HIGH** — *Auth.js: getToken() throws an uncaught exception on malformed Bearer authorization headers*

Le projet utilise `next-auth` comme **unique** mécanisme d'authentification frontend (Credentials + Google OAuth, `apps/frontend/src/lib/auth.ts`). Une CVE critique sur la brique d'auth mérite un traitement prioritaire même sans PoC applicatif spécifique rédigé ici.

**Correctif proposé :**
```bash
cd urbanflow-mobility/apps/frontend
pnpm add next-auth@^5.0.0-beta.32   # ou la dernière version stable v5 disponible au moment du correctif
```
Vérifier ensuite que `@auth/core` résolu est bien `>=0.41.3` (dépendance transitive de `next-auth`, se met à jour automatiquement dans la plupart des cas). Tester le flux Credentials + Google OAuth de bout en bout après montée de version (breaking changes possibles entre versions beta).

**Fichiers concernés :** `urbanflow-mobility/apps/frontend/package.json`, `pnpm-lock.yaml`.

---

### CRIT-03 — `next@14.2.18` : CVE critique de bypass d'autorisation Middleware

**Preuve :** `pnpm-lock.yaml` résout `next@14.2.18`, que pnpm marque explicitement `deprecated: This version has a security vulnerability` et que `pnpm audit --prod` classe **CRITIQUE** : *Authorization Bypass in Next.js Middleware* (plage vulnérable `>=14.0.0 <14.2.25`).

**Facteur atténuant vérifié :** cette CVE porte sur le contournement de contrôles d'accès faits dans `middleware.ts`. Le dépôt **ne contient aucun fichier `middleware.ts`** (recherche exhaustive dans `apps/frontend/src`) — l'app ne fait donc actuellement aucun contrôle d'accès au niveau Middleware Next.js (toute l'autorisation passe par le JWT vérifié côté NestJS). L'impact direct de *cette* CVE précise est donc probablement nul aujourd'hui, mais :
- Le paquet reste vulnérable à d'autres CVE listées par `pnpm audit` (DoS Server Components, SSRF via rewrites, SSRF WebSocket upgrade, cache poisoning — voir HIGH-04/section dépendances), certaines pertinentes même sans Middleware.
- Toute future introduction d'un `middleware.ts` (ex. pour protéger `/carte`, `/profil`, etc. côté edge) réactiverait immédiatement le risque.

**Correctif proposé :**
```bash
cd urbanflow-mobility/apps/frontend
pnpm add next@^14.2.35   # ou upgrade vers Next 15 si le projet est prêt pour cette migration
```
Tester le build (`pnpm turbo build`) et les tests E2E Cypress après montée de version.

**Fichiers concernés :** `urbanflow-mobility/apps/frontend/package.json`, `pnpm-lock.yaml`.

---

## ÉLEVÉE

### HIGH-01 — Rate limiting configuré mais jamais appliqué

**Preuve :** `apps/backend/src/app.module.ts` déclare bien `ThrottlerModule.forRoot([...])` avec un throttler nommé `auth` (10 req/60s), et `apps/backend/src/auth/auth.controller.ts:26` porte `@Throttle({ auth: { ttl: 60_000, limit: 10 } })` sur tout le contrôleur `AuthController`. **Mais** en NestJS, `@Throttle` n'a aucun effet tant que `ThrottlerGuard` n'est pas enregistré comme garde globale (`providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]`). Recherche exhaustive de `APP_GUARD` et `ThrottlerGuard` dans `apps/backend/src` : **aucune occurrence**. Le rate limiting est donc **entièrement inopérant** — c'est du code mort qui donne une fausse impression de protection.

**Impact :** `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh` et `POST /auth/oauth/google` acceptent un nombre illimité de requêtes. Combiné à HIGH-02 (refresh tokens en clair en base), cela permet en particulier :
- Brute-force de mot de passe sans limite sur `/auth/login`.
- Brute-force de tokens de refresh sur `/auth/refresh` (peu réaliste vu l'entropie du JWT, mais aucune barrière de débit en place).
- Abus de `POST /auth/register` pour du spam de comptes / bombardement d'emails de tiers si un flux d'email de confirmation est ajouté plus tard.

**Preuve de concept (à exécuter en environnement de test, pas en prod) :**
```bash
for i in $(seq 1 500); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://api-urbanflow.poutoo.dev/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"victime@example.com","password":"essai'"$i"'"}'
done
# Attendu si le throttling fonctionnait : des 429 après 10 requêtes/60s.
# Constaté par lecture de code : aucun 429, la garde n'est jamais invoquée.
```

**Correctif proposé** — enregistrer la garde globalement dans `app.module.ts` :
```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // ... providers existants s'il y en a
  ],
  // ...
})
export class AppModule {}
```
Après activation, valider que le throttler nommé `default` (60 req/60s) ne bloque pas les usages légitimes du dashboard CO₂ (polling GBFS toutes les 30s notamment — `GbfsController`), et que le throttler `auth` (10/60s) laisse un flux de connexion normal passer sans friction.

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/app.module.ts`.

---

### HIGH-02 — Refresh tokens stockés en clair en base

**Preuve :** `apps/backend/prisma/schema.prisma` — modèle `Session.refreshToken String @unique @db.Text`, et `apps/backend/src/auth/auth.service.ts` (`generateTokenPair`) insère directement le JWT signé (`this.jwtService.sign(...)`) comme valeur de `refreshToken`, sans hachage. `refreshToken()` (ligne ~156) recherche ensuite par égalité exacte (`prisma.session.findUnique({ where: { refreshToken: token } })`).

**Impact :** toute personne ayant un accès en lecture à la table `sessions` (ex. dump de base, accès admin compromis, ou — voir CRIT-01 — accès PostgREST si la clé `anon` fuit un jour) obtient directement des tokens **utilisables tels quels** contre `POST /auth/refresh`, sans avoir besoin de casser un hash. C'est l'équivalent de stocker des mots de passe en clair, appliqué aux sessions.

**Correctif proposé :** stocker un hash (SHA-256 suffit ici, ce n'est pas un secret à faible entropie comme un mot de passe humain — le JWT a une entropie cryptographique propre) du refresh token plutôt que sa valeur brute, et comparer par hash à la réception :
```ts
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// à la création
await this.prisma.session.create({
  data: { userId: user.id, refreshToken: hashToken(refreshToken), /* ... */ },
});

// à la vérification
const session = await this.prisma.session.findUnique({
  where: { refreshToken: hashToken(token) },
  include: { user: true },
});
```
Migration Prisma nécessaire (colonne déjà `String`, pas de changement de type, mais les sessions existantes en base deviendront invalides après déploiement — prévoir une invalidation/déconnexion globale ou un correctif à froid).

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/auth/auth.service.ts`, `urbanflow-mobility/apps/backend/prisma/schema.prisma` (aucun changement de schéma nécessaire, seulement de la logique applicative).

---

### HIGH-03 — Aucun header de sécurité HTTP sur le frontend

**Preuve :** `apps/frontend/next.config.js` ne définit aucune fonction `headers()`. Aucun fichier `middleware.ts` dans `apps/frontend/src`. Aucun `vercel.json` à la racine du monorepo ni dans `apps/frontend`. Confirmé également côté plateforme : `mcp__Vercel__get_project` ne montre aucune configuration de headers, et Vercel n'ajoute **pas** de CSP/HSTS/X-Frame-Options par défaut pour un projet Next.js standard.

Le backend NestJS, lui, utilise `helmet()` (`apps/backend/src/main.ts:11`) — ses réponses JSON ont donc des headers de sécurité raisonnables. **Seul le frontend (les pages HTML réellement rendues aux utilisateurs) en est dépourvu.**

**Impact concret :** les pages `/login` et `/register` (formulaires de mot de passe) n'envoient pas `X-Frame-Options` ni `Content-Security-Policy: frame-ancestors` → elles peuvent être chargées dans une `<iframe>` sur un site tiers pour du clickjacking. Absence de CSP = pas de filet de sécurité en profondeur si un XSS était introduit à l'avenir (React échappe par défaut, mais CSP reste la meilleure défense en profondeur, notamment vu MED-04 : l'access token backend est accessible en JS côté client).

**Correctif proposé** — ajouter les headers dans `next.config.js` :
```js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "img-src 'self' data: https://*.basemaps.cartocdn.com",
      "connect-src 'self' https://api-urbanflow.poutoo.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@urbanflow/types'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = withPWA(nextConfig);
```
⚠️ La CSP ci-dessus est un point de départ à affiner et **tester en profondeur** (le SDK Google OAuth / next-auth peut nécessiter des directives `script-src`/`frame-src` supplémentaires pour le flux OAuth Google, et Leaflet peut nécessiter des ajustements `img-src`/`style-src`). Ne pas déployer sans test manuel complet des flux login Google, carte Leaflet et Service Worker (PWA).

**Fichiers concernés :** `urbanflow-mobility/apps/frontend/next.config.js`.

---

### HIGH-04 — Dépendances backend avec CVE de sévérité haute

**Preuve (`pnpm audit --prod`, résolu dans `pnpm-lock.yaml`) :**

| Paquet | Chemin | CVE | Sévérité |
|--------|--------|-----|----------|
| `multer` | `apps/backend > @nestjs/platform-express > multer` | DoS (nettoyage incomplet, récursion incontrôlée, noms de champs imbriqués) — 3 avisories | High |
| `lodash` | `apps/backend > @nestjs/config > lodash` | Code Injection via `_.template` | High |
| `form-data` | `apps/backend > axios > form-data` | Injection CRLF via noms de champs/fichiers | High |
| `axios` | `apps/backend > axios` | Proxy hérité après clonage de config d'intercepteur ; pollution de prototype sur champs `auth` | High / Moderate |

Ces paquets sont des **dépendances transitives** de NestJS/axios eux-mêmes, pas du code applicatif direct — le correctif consiste à mettre à jour les paquets parents.

**Correctif proposé :**
```bash
cd urbanflow-mobility
pnpm update --recursive multer @nestjs/platform-express @nestjs/config axios
pnpm audit --prod   # revérifier après mise à jour
```
Si une mise à jour directe ne résout pas la version transitive, utiliser le champ `pnpm.overrides` dans le `package.json` racine pour forcer la version patchée (`multer >=2.1.1`, `lodash >=4.18.0`, `form-data >=4.0.6`, `axios >=1.18.0`).

**Note sur le reste du rapport `pnpm audit` :** 84 vulnérabilités au total (4 critiques, 37 hautes, 36 modérées, 7 faibles) sur les dépendances de production. La majorité des entrées "high"/"moderate" restantes concernent la **chaîne d'outillage de build** de `next-pwa` (`webpack`, `postcss`, `terser-webpack-plugin`, `brace-expansion`, `nanoid`, `serialize-javascript` — tous utilisés uniquement au moment du `next build`, jamais exécutés en runtime exposé). Elles méritent une mise à jour de routine mais sont **moins urgentes** que celles listées ci-dessus qui touchent du code exécuté en production (next, next-auth, axios, multer, lodash, form-data). Rapport JSON complet disponible sur demande (non joint ici pour ne pas alourdir ce document).

**Fichiers concernés :** `urbanflow-mobility/pnpm-lock.yaml`, `urbanflow-mobility/apps/backend/package.json`.

---

## MOYENNE

### MED-01 — `POST /co2/record` fait confiance aux valeurs de CO₂ envoyées par le client

**Preuve :** `apps/backend/src/co2/dto/record-journey.dto.ts` valide uniquement les *types* et bornes minimales (`@Min(0)`, `@IsPositive()`) de `co2SavedKg`, `co2EmittedKg`, `distanceKm`, `durationMin` — **aucune borne maximale**, et surtout **aucun recalcul serveur**. `Co2DashboardService.recordJourney()` (`apps/backend/src/co2/co2-dashboard.service.ts`) écrit directement `dto.co2SavedKg` en base et incrémente `userProfile.totalCo2SavedKg` avec cette valeur telle quelle — sans jamais rappeler `Co2Service.calculateJourneyCo2()` (le moteur de calcul officiel, utilisé uniquement au moment de l'affichage des résultats de recherche d'itinéraire dans `RoutesService`, mais jamais revérifié à l'enregistrement).

C'est le point le plus proche, dans ce dépôt, du risque "falsification de score" mentionné dans le brief (il n'y a pas de mini-jeu, mais il y a un système de badge/gamification basé sur `totalCo2SavedKg`).

**Preuve de concept :**
```bash
# Avec un accessToken valide (compte de test) :
curl -X POST https://api-urbanflow.poutoo.dev/api/co2/record \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"co2SavedKg": 999999, "co2EmittedKg": 0, "distanceKm": 1, "primaryMode": "velo", "strategy": "ecological", "durationMin": 1}'
# → 201, totalCo2SavedKg et badgeLevel du profil sont immédiatement faussés.
```
Rejouable indéfiniment (voir aussi HIGH-01 : aucun rate limiting sur ce endpoint) pour gonfler arbitrairement le badge "Éco-héros".

**Correctif proposé (deux options, à choisir selon le niveau d'exigence voulu) :**
- **Option pragmatique (borne défensive) :** ajouter des bornes maximales réalistes dans le DTO (`@Max(...)` sur `co2SavedKg`/`co2EmittedKg`/`distanceKm` — ex. 500 km/trajet, cohérent avec un usage urbain) pour limiter l'ampleur de la falsification sans réécrire l'architecture.
- **Option robuste (recommandée à moyen terme) :** faire calculer et signer le CO₂ côté serveur au moment de `POST /routes/search` (ex. retourner un identifiant d'itinéraire mis en cache avec son CO₂ pré-calculé), puis faire de `POST /co2/record` un simple `{ routeId }` qui relit la valeur serveur plutôt que de faire confiance à des champs numériques envoyés par le client.

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/co2/dto/record-journey.dto.ts`, `urbanflow-mobility/apps/backend/src/co2/co2-dashboard.service.ts`.

---

### MED-02 — `GET /places` public, sans authentification ni rate limiting

**Preuve :** `apps/backend/src/places/places.controller.ts` — aucun `@UseGuards(JwtAuthGuard)`, aucun `@Throttle`. Le service associé (`places.service.ts`) relaie la requête vers l'API payante Navitia/IDFM PRIM avec la clé serveur `NAVITIA_API_KEY` en header.

**Impact :** n'importe qui, sans compte, peut appeler `GET /api/places?q=...` en boucle et consommer le quota de la clé API Navitia (facturée/quotée par IDFM PRIM), jusqu'à épuisement — un déni de service indirect par épuisement de quota, aux frais du projet.

**Correctif proposé :** ajouter au minimum un throttling dédié (`@Throttle({ default: { ttl: 60_000, limit: 20 } })`) sur `PlacesController` — cela suppose HIGH-01 corrigé au préalable (garde globale enregistrée) pour être effectif. Évaluer aussi si l'auto-complétion de lieux doit réellement rester accessible sans compte (probable, pour l'UX de recherche avant connexion) — dans ce cas le rate limiting par IP est la protection appropriée plutôt qu'un `JwtAuthGuard`.

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/places/places.controller.ts`.

---

### MED-03 — Stratégie JWT sans restriction explicite d'algorithme

**Preuve :** `apps/backend/src/auth/strategies/jwt.strategy.ts` configure `passport-jwt` avec `secretOrKey: secret` mais sans option `algorithms: [...]`. Ce n'est pas exploitable *aujourd'hui* de façon évidente (l'app ne signe qu'en HS256 côté émission, `jwtService.sign()` sans algorithme RS256 en jeu, donc pas de confusion d'algorithme RS256↔HS256 classique possible), mais c'est un durcissement standard recommandé par OWASP pour se prémunir de tout changement futur de configuration ou de dépendance qui élargirait silencieusement les algorithmes acceptés.

**Correctif proposé :**
```ts
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: secret,
  algorithms: ['HS256'],
});
```

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/auth/strategies/jwt.strategy.ts`.

---

### MED-04 — Access token backend exposé au JavaScript client via `useSession()`

**Preuve :** `apps/frontend/src/lib/auth.ts` (callback `session()`) copie `token.accessToken` dans `session.accessToken`, lui-même consommé côté client dans des composants `'use client'` (`apps/frontend/src/hooks/useApiSwr.ts`, `apps/frontend/src/app/(app)/itineraires/page.tsx`, `apps/frontend/src/app/bienvenue-google/BienvenueGoogleClient.tsx`) via `useSession()`. NextAuth v5 sérialise cette session pour le navigateur (route `/api/auth/session`), donc l'access token JWT backend est **accessible en mémoire JS côté navigateur**, pas seulement dans un cookie `httpOnly`.

**Point positif déjà en place :** le `refreshToken`, lui, n'est **jamais** recopié dans l'objet `session` (seulement gardé dans le JWT NextAuth chiffré côté serveur) — bonne pratique déjà appliquée, à ne pas casser lors de futures évolutions.

**Impact :** c'est un compromis d'architecture assumé du pattern "pont Bearer" choisi ici (NextAuth comme façade devant une API JWT stateless), pas un bug isolé — mais il élargit la surface d'impact de tout futur XSS : un script injecté pourrait exfiltrer l'access token (durée de vie 15 min, ce qui limite la fenêtre d'exploitation). Sans XSS existant identifié dans ce dépôt (pas de `dangerouslySetInnerHTML` trouvé), ce point reste **théorique** aujourd'hui mais mérite un traitement en profondeur.

**Correctif proposé :**
- Court terme : s'assurer que HIGH-03 (CSP) est en place — c'est la meilleure atténuation pour ce point précis.
- Moyen terme, si le budget le permet : envisager un pattern BFF (Backend-For-Frontend) où les routes API Next.js (`route.ts`) relaient les appels au backend NestJS côté serveur en utilisant un cookie `httpOnly` plutôt que d'exposer l'access token au JS client. Changement d'architecture non trivial, à ne considérer qu'après les correctifs critiques/élevés ci-dessus.

**Fichiers concernés :** `urbanflow-mobility/apps/frontend/src/lib/auth.ts`, `urbanflow-mobility/apps/frontend/src/hooks/useApiSwr.ts`.

---

## FAIBLE

### LOW-01 — Énumération d'emails via `POST /auth/register`

**Preuve :** `apps/backend/src/auth/auth.service.ts` (`register()`) lève `ConflictException('Cette adresse email est déjà utilisée')` si l'email existe déjà — un attaquant peut tester une liste d'emails pour savoir lesquels ont un compte UrbanFlow.

**Correctif proposé :** compromis UX/sécurité à trancher par l'équipe — soit accepter ce risque mineur (comportement standard sur beaucoup de sites grand public), soit retourner un message générique et envoyer un email "un compte existe déjà" à l'adresse fournie plutôt qu'une erreur synchrone (nécessite un service d'envoi d'email, actuellement absent du projet).

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/auth/auth.service.ts`.

---

### LOW-02 — `LoginDto.password` sans longueur maximale

**Preuve :** `apps/backend/src/auth/dto/login.dto.ts` n'a que `@MinLength(1)`, contrairement à `RegisterDto` qui plafonne à 128 caractères. Un client peut envoyer un mot de passe de plusieurs Mo, consommé par `argon2.verify()` — surcoût CPU/mémoire mineur mais évitable.

**Correctif proposé :**
```ts
@IsString()
@MinLength(1, { message: 'Le mot de passe est requis' })
@MaxLength(128)
password!: string;
```

**Fichiers concernés :** `urbanflow-mobility/apps/backend/src/auth/dto/login.dto.ts`.

---

### LOW-03 — `withCredentials: true` inutile sur le client axios frontend

**Preuve :** `apps/frontend/src/lib/api.ts` crée une instance axios avec `withCredentials: true`, alors que l'authentification de cette app repose exclusivement sur des tokens Bearer en header (jamais de cookie d'authentification lu par le backend). Ce flag fait envoyer les cookies du domaine frontend vers le domaine backend à chaque requête cross-origin sans utilité fonctionnelle actuelle.

**Correctif proposé :** retirer `withCredentials: true` de `apps/frontend/src/lib/api.ts`, sauf si une évolution future prévoit explicitement de l'authentification par cookie.

**Fichiers concernés :** `urbanflow-mobility/apps/frontend/src/lib/api.ts`.

---

## Points vérifiés — aucune faille trouvée

Pour éviter de ré-auditer inutilement ces points lors d'une prochaine revue :

- **Secrets en dur / fuite dans le bundle client :** grep exhaustif sur les patterns `sk_`, `AKIA`, clés privées PEM, JWT en dur, tokens GitHub — aucune correspondance dans le code source. Aucune clé Supabase (`anon`/`service_role`) trouvée côté client ou serveur.
- **`.env` / `.env.local` non commités :** confirmé absent de `git ls-files` et de tout l'historique git (`git log --all --diff-filter=A`). `.gitignore` racine et `apps/**/.gitignore` couvrent correctement `.env*`. Seuls les `.env.example` (sans valeurs réelles) sont versionnés.
- **Injection SQL :** aucune requête `$queryRawUnsafe`/`$executeRawUnsafe` dans le backend ; seul `$queryRaw\`SELECT 1\`` (littéral statique, healthcheck) est utilisé. Prisma paramètre toutes les autres requêtes.
- **IDOR sur les données utilisateur :** `UsersController`, `Co2Controller` scopent systématiquement leurs requêtes sur `req.user.sub` (extrait du JWT vérifié), jamais sur un ID envoyé par le client — un utilisateur ne peut pas lire/écrire le profil ou l'historique CO₂ d'un autre utilisateur via l'API.
- **CORS backend :** `app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })` — origine unique configurée (`https://urbanflow.poutoo.dev` en prod via `.env.example`), pas de wildcard `*`.
- **XSS via `dangerouslySetInnerHTML` :** aucune occurrence dans `apps/frontend/src` (recherche exhaustive) — React échappe par défaut le contenu, y compris les pages légales (`content/legal/*.md`) et les noms d'utilisateurs affichés.
- **Google OAuth :** `AuthService.loginWithGoogle()` vérifie l'`audience`, `email_verified` et `sub` avant de faire confiance à l'ID token — pas de contournement identifié.
- **Docker :** `apps/backend/Dockerfile` — build multi-stage, exécution en tant qu'utilisateur non-root (`USER node`), `.env*` explicitement exclus du contexte de build (`.dockerignore`), secrets de build factices documentés comme tels. Bonne pratique en place, rien à corriger.
- **Protection des déploiements Vercel :** vérifié en direct via l'API Vercel (projet `urbanflow`, équipe `poutoo-projects`) — la protection SSO Vercel Authentication est activée sur tous les déploiements sauf le domaine personnalisé de prod (`all_except_custom_domains`), ce qui empêche l'accès public aux URLs de preview `*.vercel.app` tout en laissant le domaine de prod public comme attendu. Configuration correcte.
- **CI GitHub Actions (`/.github/workflows/ci.yml`) :** aucun `pull_request_target`, secrets CI factices explicitement documentés comme non réutilisables en prod, pas de fuite identifiée.

---

## Vérifications manuelles à faire (non couvrables par analyse statique)

Ces points nécessitent un test en conditions réelles, dans un navigateur ou via le dashboard des prestataires — je n'ai pas pu les vérifier moi-même par manque d'accès ou parce qu'ils dépendent du runtime :

1. **Headers de sécurité en conditions réelles** — une fois HIGH-03 corrigé, vérifier avec `curl -I https://urbanflow.poutoo.dev` (ou l'outil [securityheaders.com](https://securityheaders.com)) que CSP/HSTS/X-Frame-Options sont bien présents sur la réponse HTML réelle, et qu'ils ne cassent pas Google OAuth, Leaflet ou le Service Worker PWA en navigation réelle.
2. **Test de soumission de score falsifié (MED-01)** — reproduire en environnement de test la requête `POST /co2/record` avec des valeurs aberrantes decrite plus haut, et confirmer visuellement dans `/empreinte` que le badge/dashboard se met à jour de façon incohérente.
3. **Test de brute-force réel post-correctif HIGH-01** — après avoir enregistré `ThrottlerGuard`, relancer un script de connexions répétées sur `/auth/login` en environnement de test et vérifier l'apparition de réponses `429 Too Many Requests`.
4. **Inspection réseau en live (DevTools → Network/Application)** sur `urbanflow.poutoo.dev` :
   - Onglet Application → Cookies : confirmer qu'aucun cookie sensible n'est en clair/non-`httpOnly` en dehors du cookie de session NextAuth chiffré attendu.
   - Onglet Network : confirmer qu'aucune requête vers `*.supabase.co` n'est émise depuis le navigateur (cohérent avec l'architecture Prisma-only documentée dans ce rapport — si une telle requête apparaissait, ce serait un signal fort d'une régression à investiguer en urgence).
5. **Vérification de la clé `anon` Supabase et de la surface PostgREST réelle** — depuis le dashboard Supabase du projet `urbanflow` (Project Settings → API), confirmer si l'API REST/PostgREST du projet est exposée publiquement par défaut ou si des restrictions réseau existent déjà (au-delà de RLS). Envisager, en complément de CRIT-01, de désactiver purement et simplement l'API de données Supabase (Data API) dans les Project Settings si elle n'est jamais utilisée intentionnellement — cela supprime la surface d'attaque à la source, pas seulement via RLS.
6. **Rotation des secrets** — après correctif de HIGH-02 (hachage des refresh tokens), envisager une rotation de `JWT_SECRET`/`JWT_REFRESH_SECRET` en production pour invalider toute session potentiellement déjà compromise (je n'ai pas eu et ne dois pas avoir accès aux valeurs réelles de ces secrets en production — à faire par l'équipe via le dashboard Railway/VPS).
7. **Test mobile / responsive des pages d'authentification** après ajout de la CSP (HIGH-03), pour confirmer qu'aucune ressource (fonts, tuiles de carte, icônes PWA) n'est bloquée sur un test réel en réseau mobile.
8. **Quota réel de la clé `NAVITIA_API_KEY`** (MED-02) — vérifier auprès du dashboard IDFM PRIM le quota actuel et si des pics d'usage anormaux sont déjà visibles dans les logs, signe d'un abus déjà en cours du endpoint `/places`.
9. **Variables d'environnement réelles en production** — je n'ai pas eu accès aux valeurs réelles des variables d'environnement Vercel/Railway/VPS (seulement à leur documentation dans les `.env.example` et au fait que `CORS_ORIGIN` est bien scopé dans l'exemple fourni). À vérifier manuellement que `NODE_ENV=production`, `CORS_ORIGIN` et les secrets JWT sont correctement positionnés sur chaque environnement de déploiement réel.

---

*Rapport généré par revue statique du code + interrogation directe de l'infrastructure réelle (Supabase Advisor API, Vercel API). Aucun correctif n'a été appliqué au code de ce dépôt.*
