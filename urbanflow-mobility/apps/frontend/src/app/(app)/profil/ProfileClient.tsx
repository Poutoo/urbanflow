'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EcoBadge } from '@/components/profile/EcoBadge';
import { TransportModes } from '@/components/profile/TransportModes';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useApiSwr } from '@/hooks/useApiSwr';
import { useProfileMutation } from '@/hooks/useProfileMutation';
import type { AuthMeResponse, PriorityMode, TransportMode, UserProfile } from '@urbanflow/types';

interface InitialUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface FavoriteAddress {
  icon: string;
  label: string;
  address: string;
}

const FAVORITE_ADDRESSES: FavoriteAddress[] = [
  { icon: 'ph:house-simple', label: 'Domicile', address: '12 rue des Lilas, Centre' },
  { icon: 'ph:briefcase', label: 'Travail', address: "Parc d'activités Nord, Bât. C" },
];

const PRIORITY_MODES: { value: PriorityMode; label: string }[] = [
  { value: 'ecological', label: 'Écologique' },
  { value: 'fast', label: 'Rapide' },
  { value: 'economic', label: 'Économique' },
];

const DEFAULT_MODES: TransportMode[] = ['velo', 'tram', 'metro', 'marche'];

export function ProfileClient({ initialUser }: { initialUser: InitialUser }) {
  const [selectedModes, setSelectedModes] = useState<TransportMode[]>(DEFAULT_MODES);
  const [priorityMode, setPriorityMode] = useState<PriorityMode>('ecological');
  const [pmrEnabled, setPmrEnabled] = useState(false);
  const [noStairsEnabled, setNoStairsEnabled] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Badge éco-mobile à 3 paliers + total CO₂ économisé depuis l'API
  const { data: me } = useApiSwr<AuthMeResponse>('/auth/me');
  // Réglages persistés (modes, priorité, accessibilité, thème)
  const { data: profile } = useApiSwr<UserProfile>('/users/profile');
  const persist = useProfileMutation();

  // Hydrate l'état local depuis le backend une seule fois au premier chargement
  // (ne doit pas écraser une modification en cours de l'utilisateur lors d'une revalidation SWR).
  useEffect(() => {
    if (!profile || hydrated) return;
    setSelectedModes(profile.preferredModes);
    setPriorityMode(profile.priorityMode);
    setPmrEnabled(profile.pmrEnabled);
    setNoStairsEnabled(profile.noStairsEnabled);
    setVoiceGuidanceEnabled(profile.voiceGuidanceEnabled);
    setHydrated(true);
  }, [profile, hydrated]);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* Header profil */}
      <Card padding="sm">
        <ProfileHeader
          name={initialUser.name}
          email={initialUser.email}
          avatarUrl={initialUser.avatarUrl}
        />
        {me && (
          <EcoBadge badgeLevel={me.profile.badgeLevel} totalCo2SavedKg={me.profile.totalCo2SavedKg} />
        )}
      </Card>

      {/* Adresses favorites */}
      <section aria-label="Adresses favorites">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
            ADRESSES FAVORITES
          </h2>
          <button
            type="button"
            className="text-sm font-medium text-[#1A5F7A] underline-offset-2 hover:underline dark:text-primary-content"
          >
            Gérer
          </button>
        </div>
        <Card padding="sm">
          <ul className="divide-y divide-gray-100 dark:divide-divider">
            {FAVORITE_ADDRESSES.map((addr) => (
              <li key={addr.label} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-[#1A5F7A] dark:bg-divider/60 dark:text-primary-content"
                  aria-hidden="true"
                >
                  <Icon icon={addr.icon} width={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-text-main">{addr.label}</p>
                  <p className="truncate text-sm text-[#6B7280] dark:text-muted">{addr.address}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Options pour ${addr.label}`}
                  className="text-[#6B7280] dark:text-muted"
                >
                  ···
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-3 text-[#1A5F7A] font-medium dark:text-primary-content"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-dashed border-[#1A5F7A]/30 text-lg dark:border-primary-content/30"
                  aria-hidden="true"
                >
                  +
                </span>
                Ajouter une adresse
              </button>
            </li>
          </ul>
        </Card>
      </section>

      {/* Modes de transport */}
      <Card>
        <TransportModes
          initial={selectedModes}
          onChange={(modes) => {
            setSelectedModes(modes);
            void persist({ preferredModes: modes });
          }}
        />
      </Card>

      {/* Priorité d'itinéraire */}
      <section aria-label="Priorité d'itinéraire">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          PRIORITÉ D&apos;ITINÉRAIRE
        </h2>
        <Card padding="sm">
          <div role="group" aria-label="Mode de priorité" className="flex rounded-[8px] overflow-hidden border border-gray-200 dark:border-divider">
            {PRIORITY_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={priorityMode === value}
                onClick={() => {
                  setPriorityMode(value);
                  void persist({ priorityMode: value });
                }}
                className={[
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  priorityMode === value
                    ? 'bg-[#1A5F7A] text-white'
                    : 'bg-white text-[#6B7280] hover:bg-gray-50 dark:bg-surface dark:text-muted dark:hover:bg-divider/40',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </section>

      {/* Accessibilité */}
      <section aria-label="Accessibilité">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          ACCESSIBILITÉ
        </h2>
        <p className="mb-2 text-xs text-[#6B7280] dark:text-muted">Conformité WCAG 2.1 AA</p>
        <Card padding="sm">
          <div className="divide-y divide-gray-100 dark:divide-divider">
            <ToggleRow
              icon="ph:wheelchair"
              label="Itinéraires PMR"
              description="Prioriser les trajets accessibles"
              checked={pmrEnabled}
              onToggle={() => {
                const next = !pmrEnabled;
                setPmrEnabled(next);
                void persist({ pmrEnabled: next });
              }}
            />
            <ToggleRow
              icon="ph:stairs"
              label="Sans marches ni escaliers"
              description="Éviter les trajets nécessitant des escaliers"
              checked={noStairsEnabled}
              onToggle={() => {
                const next = !noStairsEnabled;
                setNoStairsEnabled(next);
                void persist({ noStairsEnabled: next });
              }}
            />
            <ToggleRow
              icon="ph:speaker-high"
              label="Guidage vocal"
              description="Instructions audio pendant le trajet"
              checked={voiceGuidanceEnabled}
              onToggle={() => {
                const next = !voiceGuidanceEnabled;
                setVoiceGuidanceEnabled(next);
                void persist({ voiceGuidanceEnabled: next });
              }}
            />
          </div>
        </Card>
      </section>

      {/* Application */}
      <section aria-label="Application">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          APPLICATION
        </h2>
        <Card padding="sm">
          <div className="divide-y divide-gray-100 dark:divide-divider">
            <ThemeToggle backendThemeMode={profile?.themeMode} />
            <Link
              href="/aide-confidentialite"
              className="flex items-center justify-between gap-3 py-2.5 font-medium text-[#0F1B2D] hover:text-[#1A5F7A] dark:text-text-main dark:hover:text-primary-content"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-[#1A5F7A] dark:bg-divider/60 dark:text-primary-content"
                  aria-hidden="true"
                >
                  <Icon icon="ph:info" width={18} />
                </span>
                Aide &amp; confidentialité
              </span>
              <span aria-hidden="true" className="text-[#6B7280] dark:text-muted">
                ›
              </span>
            </Link>
          </div>
        </Card>
      </section>

      {/* Déconnexion */}
      <Button
        variant="secondary"
        size="lg"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Se déconnecter
      </Button>
    </div>
  );
}
