# Sprint 3 — GBFS + Calculateur CO₂

> **Objectif** : Implémenter F3 — dashboard personnel CO₂ avec persistence des trajets, agrégation hebdomadaire/mensuelle, gamification (badge Éco-mobile), et finaliser l'intégration GBFS.
> **Branche Git** : `feat/sprint-3-dashboard-co2`
> **Critère de validation** :
> - Un utilisateur connecté peut valider un itinéraire → le CO₂ économisé est enregistré en BDD
> - La page /empreinte affiche le graphique hebdomadaire, l'objectif mensuel, et la répartition par mode
> - Le badge "Éco-mobile" s'affiche sur le profil quand le seuil est atteint
> - Les stations GBFS sont mises à jour automatiquement toutes les 30s

---

## Contexte Sprint 3 — Ce qui existe déjà

Du Sprint 2, tu as :
- `Co2Service` : calcul CO₂ par trajet (facteurs ADEME) ✅
- `GbfsService` : stations Vélib' à proximité ✅
- `RoutesService` : les 3 stratégies avec `co2Kg` et `co2SavedKg` calculés ✅
- `UserProfile` : champ `co2Goal` (défaut : 40 kg/mois) ✅
- Page `/itineraires` : l'utilisateur voit les 3 options et sélectionne

**Ce qui manque** : rien n'est encore *persisté*. Quand l'utilisateur valide "Démarrer l'itinéraire écologique", le CO₂ n'est pas sauvegardé. Sprint 3 ferme cette boucle.

---

## Étapes dans l'ordre (NE PAS SAUTER)

### ✅ ÉTAPE 1 — Extension du schéma Prisma (30min)

**1.1 Ajouter le modèle Co2Record**

```prisma
// apps/backend/prisma/schema.prisma — ajouter après SavedRoute

model Co2Record {
  id           String   @id @default(cuid())
  userId       String
  date         DateTime @default(now())
  co2SavedKg   Float                        // CO₂ économisé vs voiture
  co2EmittedKg Float                        // CO₂ réellement émis par le trajet
  distanceKm   Float
  primaryMode  String                       // mode dominant : "metro", "bus", "velo", etc.
  strategy     String                       // "fast" | "ecological" | "economic"
  durationMin  Int
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])                   // index pour les requêtes de dashboard
  @@map("co2_records")
}
```

**1.2 Mettre à jour UserProfile**

```prisma
model UserProfile {
  // ... champs existants ...
  co2Goal          Float    @default(40.0)  // existe déjà
  ecoMobileBadge   Boolean  @default(false) // ← AJOUTER
  totalCo2SavedKg  Float    @default(0)    // ← AJOUTER (compteur cumulé)

  co2Records       Co2Record[]             // ← AJOUTER relation
}
```

**1.3 Ajouter la relation inverse sur User**

```prisma
model User {
  // ... champs existants ...
  co2Records Co2Record[]  // ← AJOUTER
}
```

**1.4 Migrer**

```bash
pnpm --filter backend prisma migrate dev --name add-co2-records
pnpm --filter backend prisma generate
```

**Checkpoint 1 ✅** : `pnpm prisma studio` montre la table `co2_records`.

---

### ✅ ÉTAPE 2 — Module CO₂ Dashboard (Backend) (1h30)

**2.1 Structure des fichiers**

```
apps/backend/src/co2/
├── co2.module.ts          # existant — ajouter Co2DashboardService
├── co2.service.ts         # existant — facteurs ADEME, calculs
├── co2-dashboard.service.ts  # ← NOUVEAU
├── co2.controller.ts      # ← NOUVEAU
└── dto/
    ├── record-journey.dto.ts  # ← NOUVEAU
    └── co2-stats.dto.ts       # ← NOUVEAU
```

**2.2 DTO — RecordJourneyDto**

```typescript
// dto/record-journey.dto.ts
import { IsNumber, IsString, IsIn, IsPositive } from 'class-validator'

export class RecordJourneyDto {
  @IsNumber() @IsPositive() co2SavedKg: number
  @IsNumber() @IsPositive() co2EmittedKg: number
  @IsNumber() @IsPositive() distanceKm: number
  @IsString() primaryMode: string           // "metro" | "bus" | "velo" | etc.
  @IsIn(['fast', 'ecological', 'economic']) strategy: string
  @IsNumber() @IsPositive() durationMin: number
}
```

**2.3 Co2DashboardService — les 4 méthodes clés**

```typescript
// co2-dashboard.service.ts
@Injectable()
export class Co2DashboardService {
  constructor(private prisma: PrismaService) {}

  // Enregistrer un trajet + mettre à jour le compteur cumulé + vérifier le badge
  async recordJourney(userId: string, dto: RecordJourneyDto): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Créer le record
      await tx.co2Record.create({
        data: {
          userId,
          co2SavedKg:   dto.co2SavedKg,
          co2EmittedKg: dto.co2EmittedKg,
          distanceKm:   dto.distanceKm,
          primaryMode:  dto.primaryMode,
          strategy:     dto.strategy,
          durationMin:  dto.durationMin,
        },
      })

      // 2. Mettre à jour le total cumulé
      const profile = await tx.userProfile.update({
        where: { userId },
        data: { totalCo2SavedKg: { increment: dto.co2SavedKg } },
      })

      // 3. Décerner le badge si seuil atteint (10 kg)
      if (!profile.ecoMobileBadge && profile.totalCo2SavedKg >= 10) {
        await tx.userProfile.update({
          where: { userId },
          data: { ecoMobileBadge: true },
        })
      }
    })
  }

  // Stats hebdomadaires (7 derniers jours)
  async getWeeklyStats(userId: string): Promise<WeeklyStats> {
    const since = new Date()
    since.setDate(since.getDate() - 6)
    since.setHours(0, 0, 0, 0)

    const records = await this.prisma.co2Record.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    })

    // Agréger par jour (Lu Ma Me Je Ve Sa Di)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since)
      d.setDate(since.getDate() + i)
      return {
        label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][d.getDay() === 0 ? 6 : d.getDay() - 1],
        date: d.toISOString().split('T')[0],
        co2SavedKg: 0,
      }
    })

    for (const r of records) {
      const dateStr = r.date.toISOString().split('T')[0]
      const day = days.find((d) => d.date === dateStr)
      if (day) day.co2SavedKg += r.co2SavedKg
    }

    return {
      days,
      totalWeekKg: days.reduce((s, d) => s + d.co2SavedKg, 0),
    }
  }

  // Progression mensuelle vs objectif
  async getMonthlyProgress(userId: string): Promise<MonthlyProgress> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [records, profile] = await Promise.all([
      this.prisma.co2Record.findMany({
        where: { userId, date: { gte: startOfMonth } },
      }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
    ])

    const savedThisMonth = records.reduce((s, r) => s + r.co2SavedKg, 0)
    const goal = profile?.co2Goal ?? 40

    return {
      savedKg: savedThisMonth,
      goalKg: goal,
      progressPercent: Math.min(100, Math.round((savedThisMonth / goal) * 100)),
      remainingKg: Math.max(0, goal - savedThisMonth),
    }
  }

  // Répartition par mode de transport (mois en cours)
  async getModeBreakdown(userId: string): Promise<ModeBreakdown[]> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const records = await this.prisma.co2Record.findMany({
      where: { userId, date: { gte: startOfMonth } },
    })

    const byMode: Record<string, { distanceKm: number; count: number }> = {}
    let totalKm = 0

    for (const r of records) {
      if (!byMode[r.primaryMode]) byMode[r.primaryMode] = { distanceKm: 0, count: 0 }
      byMode[r.primaryMode].distanceKm += r.distanceKm
      byMode[r.primaryMode].count++
      totalKm += r.distanceKm
    }

    return Object.entries(byMode).map(([mode, data]) => ({
      mode,
      distanceKm: Math.round(data.distanceKm),
      count: data.count,
      percentage: totalKm > 0 ? Math.round((data.distanceKm / totalKm) * 100) : 0,
    }))
  }
}
```

**2.4 Co2Controller**

```typescript
// co2.controller.ts
@Controller('co2')
@UseGuards(JwtAuthGuard)
export class Co2Controller {
  constructor(private readonly dashboard: Co2DashboardService) {}

  @Post('record')            // Valider un trajet → enregistrer le CO₂
  record(@GetUser() user: AuthUser, @Body() dto: RecordJourneyDto) {
    return this.dashboard.recordJourney(user.id, dto)
  }

  @Get('weekly')             // Graphique barres 7 jours
  weekly(@GetUser() user: AuthUser) {
    return this.dashboard.getWeeklyStats(user.id)
  }

  @Get('monthly')            // Objectif mensuel
  monthly(@GetUser() user: AuthUser) {
    return this.dashboard.getMonthlyProgress(user.id)
  }

  @Get('breakdown')          // Répartition par mode
  breakdown(@GetUser() user: AuthUser) {
    return this.dashboard.getModeBreakdown(user.id)
  }

  @Get('summary')            // Tout en une requête (pour la page /empreinte)
  async summary(@GetUser() user: AuthUser) {
    const [weekly, monthly, breakdown] = await Promise.all([
      this.dashboard.getWeeklyStats(user.id),
      this.dashboard.getMonthlyProgress(user.id),
      this.dashboard.getModeBreakdown(user.id),
    ])
    return { weekly, monthly, breakdown }
  }
}
```

**Endpoints finaux :**

| Méthode | Path | Guard | Description |
|---------|------|-------|-------------|
| POST | `/api/co2/record` | JWT | Enregistrer un trajet validé |
| GET | `/api/co2/weekly` | JWT | Graphique 7 jours |
| GET | `/api/co2/monthly` | JWT | Progression objectif mensuel |
| GET | `/api/co2/breakdown` | JWT | Répartition par mode |
| GET | `/api/co2/summary` | JWT | Tout en une requête |

**Checkpoint 2 ✅** : `POST /api/co2/record` avec un JWT valide crée un enregistrement en BDD.

---

### ✅ ÉTAPE 3 — Connexion Frontend → Backend après sélection d'itinéraire (45min)

**3.1 Quand enregistrer le CO₂ ?**

Quand l'utilisateur clique sur **"Démarrer l'itinéraire [X]"** dans la page `/itineraires`.

```typescript
// apps/frontend/src/app/(app)/itineraires/page.tsx
const handleStartJourney = async (strategy: 'fast' | 'ecological' | 'economic') => {
  const selected = routeResults[strategy]
  if (!selected) return

  // Déterminer le mode dominant (mode avec la plus grande durée)
  const primaryMode = selected.sections
    .filter((s) => s.type === 'public_transport')
    .sort((a, b) => b.duration - a.duration)[0]?.mode?.toLowerCase() ?? 'walking'

  try {
    await api.post('/co2/record', {
      co2SavedKg:   selected.co2SavedKg,
      co2EmittedKg: selected.co2Kg,
      distanceKm:   selected.sections.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0),
      primaryMode,
      strategy,
      durationMin: Math.round(selected.duration / 60),
    })
  } catch (err) {
    // Non bloquant — on ne plante pas si l'enregistrement échoue
    console.warn('CO₂ record failed:', err)
  }

  // Continuer vers la vue du trajet actif
  router.push(`/itineraires/actif?strategy=${strategy}`)
}
```

**Checkpoint 3 ✅** : Après avoir cliqué "Démarrer", la table `co2_records` contient une nouvelle ligne.

---

### ✅ ÉTAPE 4 — Page /empreinte (Frontend) (1h30)

**4.1 Structure des composants**

```
apps/frontend/src/app/(app)/empreinte/
├── page.tsx                      # Page principale
└── components/
    ├── WeeklyChart.tsx           # Graphique barres SVG
    ├── MonthlyGoal.tsx           # Barre de progression + objectif
    ├── ModeBreakdown.tsx         # Liste répartition par mode
    └── EcoMobileBadge.tsx        # Badge gamification
```

**4.2 WeeklyChart — graphique SVG natif (pas de lib externe)**

```typescript
// WeeklyChart.tsx — graphique barres SVG simple, fidèle à la maquette écran 4
interface Props {
  days: { label: string; co2SavedKg: number }[]
  highlightDay?: number  // index du jour avec la plus grande valeur
}

export function WeeklyChart({ days, highlightDay }: Props) {
  const max = Math.max(...days.map((d) => d.co2SavedKg), 1)

  return (
    <div className="flex items-end justify-between gap-2 h-32 px-2">
      {days.map((day, i) => {
        const heightPct = (day.co2SavedKg / max) * 100
        const isHighlight = i === highlightDay ||
          (highlightDay === undefined && day.co2SavedKg === Math.max(...days.map(d => d.co2SavedKg)))

        return (
          <div key={day.label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-gray-500">{day.co2SavedKg > 0 ? day.co2SavedKg.toFixed(1) : ''}</span>
            <div className="w-full flex items-end" style={{ height: '80px' }}>
              <div
                className={`w-full rounded-t-sm transition-all ${isHighlight ? 'bg-[#2D7D46]' : 'bg-[#D4EFE1]'}`}
                style={{ height: `${Math.max(heightPct, 4)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}
```

**4.3 MonthlyGoal — barre de progression**

```typescript
// MonthlyGoal.tsx
export function MonthlyGoal({ savedKg, goalKg, progressPercent, remainingKg }: MonthlyProgress) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold">Objectif mensuel</span>
        <span className="font-bold text-[#B85C00]">{savedKg.toFixed(0)} / {goalKg} kg</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#B85C00] rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {remainingKg > 0 ? (
        <p className="text-sm text-gray-500">
          Plus que {remainingKg.toFixed(0)} kg — vous y êtes presque 👍
        </p>
      ) : (
        <p className="text-sm text-[#2D7D46] font-semibold">Objectif atteint ce mois-ci ! 🎉</p>
      )}
    </div>
  )
}
```

**4.4 ModeBreakdown — répartition par mode**

Reproduire fidèlement la maquette écran 4 :
- Barre colorée horizontale multi-segments en haut
- Liste dessous : icône mode + distance km + pourcentage

Couleurs par mode (design system) :
```typescript
const MODE_COLORS: Record<string, string> = {
  velo:        '#16A34A',
  bicycle:     '#16A34A',
  bss_rent:    '#16A34A',
  bus:         '#1D4ED8',
  tram:        '#B45309',
  metro:       '#4F46E5',
  rapidtransit:'#4F46E5',
  walking:     '#7C3AED',
  default:     '#6B7280',
}
```

**4.5 Badge Éco-mobile**

```typescript
// EcoMobileBadge.tsx
export function EcoMobileBadge({ earned }: { earned: boolean }) {
  if (!earned) return null
  return (
    <div className="flex items-center gap-2 bg-[#D4EFE1] text-[#1A5C33] px-3 py-1.5 rounded-full text-sm font-semibold">
      <span>🌿</span>
      <span>Éco-mobile</span>
    </div>
  )
}
```

**4.6 Page /empreinte — assemblage**

```typescript
// empreinte/page.tsx
'use client'
export default function EmpreintePage() {
  const { data, isLoading } = useSWR('/api/co2/summary', fetcher)

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Mon empreinte</h1>
          <p className="text-sm text-gray-500">Semaine du {getWeekLabel()}</p>
        </div>
        <button onClick={handleShare}>
          {/* icône partage */}
        </button>
      </div>

      {/* Graphique hebdomadaire */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">CO₂ évité par jour</h2>
          <div className="flex gap-2 text-sm">
            <span className="font-semibold text-[#1A5F7A]">Semaine</span>
            <span className="text-gray-400">Mois</span>
          </div>
        </div>
        <WeeklyChart days={data.weekly.days} />
      </div>

      {/* Objectif mensuel */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <MonthlyGoal {...data.monthly} />
      </div>

      {/* Répartition par mode */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-semibold mb-1">Répartition de vos trajets</h2>
        <p className="text-sm text-gray-500 mb-3">
          {data.breakdown.reduce((s, m) => s + m.distanceKm, 0)} km parcourus en mobilité douce
        </p>
        <ModeBreakdown breakdown={data.breakdown} />
      </div>
    </div>
  )
}
```

**Checkpoint 4 ✅** : La page /empreinte affiche le graphique, l'objectif et la répartition avec les vraies données.

---

### ✅ ÉTAPE 5 — Badge Éco-mobile sur le Profil (30min)

**5.1 Ajouter le badge dans la réponse `GET /auth/me`**

Inclure `ecoMobileBadge` dans le profil retourné par `AuthService.getMe()` :

```typescript
// auth.service.ts — getMe()
async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },    // inclure le profil complet
  })
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    profile: {
      preferredModes:   user.profile?.preferredModes ?? [],
      priorityMode:     user.profile?.priorityMode ?? 'ecological',
      pmrEnabled:       user.profile?.pmrEnabled ?? false,
      co2Goal:          user.profile?.co2Goal ?? 40,
      totalCo2SavedKg:  user.profile?.totalCo2SavedKg ?? 0,
      ecoMobileBadge:   user.profile?.ecoMobileBadge ?? false,  // ← AJOUTER
    },
  }
}
```

**5.2 Afficher le badge sur la page /profil**

```typescript
// profil/page.tsx — section en-tête
<div className="flex items-center gap-3">
  <Avatar name={user.name} />
  <div>
    <p className="font-bold">{user.name}</p>
    <p className="text-sm text-gray-500">{user.email}</p>
    <EcoMobileBadge earned={user.profile.ecoMobileBadge} />
  </div>
</div>
```

**Checkpoint 5 ✅** : Après 10 kg de CO₂ économisés, le badge apparaît sur le profil.

---

### ✅ ÉTAPE 6 — Amélioration GBFS (30min)

Le GbfsService du Sprint 2 fonctionne, mais on ajoute deux améliorations :

**6.1 Rafraîchissement automatique côté frontend (SWR)**

```typescript
// MapView.tsx ou composant StationMarkers
const { data: stations } = useSWR(
  userLocation ? `/api/gbfs/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}` : null,
  fetcher,
  { refreshInterval: 30_000 }  // refresh toutes les 30s
)
```

**6.2 Endpoint dédié GBFS (si pas encore exposé)**

```typescript
// Si GET /api/gbfs/nearby n'existe pas encore, l'ajouter dans GbfsController
@Get('nearby')
@UseGuards(JwtAuthGuard)
getNearby(
  @Query('lat', ParseFloatPipe) lat: number,
  @Query('lng', ParseFloatPipe) lng: number,
  @Query('radius', ParseFloatPipe) radius?: number,
) {
  return this.gbfs.getNearbyStations(lat, lng, radius ?? 400)
}
```

**Checkpoint 6 ✅** : Les marqueurs Vélib' sur la carte se mettent à jour automatiquement toutes les 30s.

---

### ✅ ÉTAPE 7 — Tests Sprint 3 (1h)

**Tests unitaires — Co2DashboardService**

```typescript
// co2-dashboard.service.spec.ts
describe('Co2DashboardService', () => {
  describe('recordJourney', () => {
    it('crée un record en BDD', ...)
    it('incrémente totalCo2SavedKg sur le profil', ...)
    it('décerne le badge ecoMobile quand totalCo2SavedKg >= 10', ...)
    it('ne décerne pas le badge si totalCo2SavedKg < 10', ...)
    it('ne décerne pas le badge deux fois', ...)
  })

  describe('getWeeklyStats', () => {
    it('retourne 7 jours avec les bons labels', ...)
    it('agrège correctement plusieurs trajets le même jour', ...)
    it('retourne 0 pour les jours sans trajet', ...)
  })

  describe('getMonthlyProgress', () => {
    it('calcule correctement le pourcentage de progression', ...)
    it('ne dépasse pas 100% même si l\'objectif est dépassé', ...)
    it('utilise co2Goal du profil utilisateur', ...)
  })

  describe('getModeBreakdown', () => {
    it('groupe correctement les trajets par mode', ...)
    it('calcule les pourcentages correctement (total = 100%)', ...)
    it('retourne un tableau vide si aucun trajet ce mois-ci', ...)
  })
})
```

**Tests d'intégration — endpoints**

```typescript
// co2.controller.spec.ts (Supertest)
describe('POST /api/co2/record', () => {
  it('sans JWT → 401', ...)
  it('avec co2SavedKg négatif → 400', ...)
  it('strategy invalide → 400', ...)
  it('cas nominal → 201, record créé en BDD', ...)
})

describe('GET /api/co2/summary', () => {
  it('sans JWT → 401', ...)
  it('retourne weekly + monthly + breakdown', ...)
})
```

**Cibles de couverture Sprint 3 :**

| Module | Cible |
|--------|-------|
| Co2DashboardService | ≥ 90 % |
| Co2Controller | ≥ 80 % |
| GbfsController (si nouveau) | ≥ 75 % |
| **Couverture globale lignes** | **≥ 68 %** |

**Checkpoint 7 ✅** : `pnpm test` passe. `pnpm test:coverage` montre ≥ 68% lignes.

---

## ⚠️ Points de vigilance

**1. Transaction Prisma obligatoire dans `recordJourney`**  
Le record + mise à jour du compteur + attribution du badge doivent être atomiques. Si l'un échoue, tout doit rollback. Utiliser `prisma.$transaction()`.

**2. `co2SavedKg` peut être 0**  
Si l'utilisateur prend un trajet "Rapide" peu écologique, le CO₂ économisé peut être négatif (émis > voiture référence). Dans ce cas : `Math.max(0, ...)` déjà géré dans Co2Service — ne pas décrementer le compteur.

**3. SWR pour les données de la page /empreinte**  
Installer si pas encore présent :
```bash
pnpm --filter frontend add swr
```

**4. L'objectif 40 kg/mois est personnalisable**  
La page Paramètres (écran 6) doit permettre de modifier `co2Goal`. L'endpoint `PUT /users/profile` du Sprint 1 peut déjà le gérer si `co2Goal` est dans l'UpdateProfileDto.

**5. Pas de chart library externe**  
Le graphique barres est en SVG pur (voir WeeklyChart ci-dessus) pour respecter la contrainte éco-conception C5 — pas de bundle supplémentaire.

---

## Résumé des livrables Sprint 3

| Livrable | Description |
|----------|-------------|
| Migration Prisma | Modèle `co2_records` + champs `ecoMobileBadge` + `totalCo2SavedKg` |
| Co2DashboardService | recordJourney, getWeeklyStats, getMonthlyProgress, getModeBreakdown |
| Co2Controller | 5 endpoints sécurisés JWT |
| Connexion itinéraire → CO₂ | `POST /co2/record` appelé après "Démarrer l'itinéraire" |
| Page /empreinte | Graphique barres SVG + objectif mensuel + répartition par mode |
| Badge Éco-mobile | Décerné à 10 kg, affiché sur le profil |
| GBFS refresh | Mise à jour automatique stations toutes les 30s |
| Tests | ≥ 15 nouveaux tests, couverture globale ≥ 68% |

---

## Ce qui N'est PAS dans Sprint 3

- Audit Lighthouse → Sprint 4
- Tests E2E Cypress → Sprint 4
- Mode offline complet → Sprint 4
- Historique des trajets passés (liste) → hors périmètre v1
- Notifications push perturbations → roadmap v2