'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EcoBadge } from '@/components/profile/EcoBadge';
import { TransportModes } from '@/components/profile/TransportModes';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useApiSwr } from '@/hooks/useApiSwr';
import type { AuthMeResponse, PriorityMode, TransportMode } from '@urbanflow/types';

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
  { icon: '🏠', label: 'Domicile', address: '12 rue des Lilas, Centre' },
  { icon: '💼', label: 'Travail', address: "Parc d'activités Nord, Bât. C" },
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

  // Badge éco-mobile à 3 paliers + total CO₂ économisé depuis l'API
  const { data: me } = useApiSwr<AuthMeResponse>('/auth/me');

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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
            ADRESSES FAVORITES
          </h2>
          <button
            type="button"
            className="text-sm font-medium text-[#1A5F7A] underline-offset-2 hover:underline"
          >
            Gérer
          </button>
        </div>
        <Card padding="sm">
          <ul className="divide-y divide-gray-100">
            {FAVORITE_ADDRESSES.map((addr) => (
              <li key={addr.label} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-lg"
                  aria-hidden="true"
                >
                  {addr.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D]">{addr.label}</p>
                  <p className="truncate text-sm text-[#6B7280]">{addr.address}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Options pour ${addr.label}`}
                  className="text-[#6B7280]"
                >
                  ···
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-3 text-[#1A5F7A] font-medium"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-dashed border-[#1A5F7A]/30 text-lg"
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
        <TransportModes initial={selectedModes} onChange={setSelectedModes} />
      </Card>

      {/* Priorité d'itinéraire */}
      <section aria-label="Priorité d'itinéraire">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          PRIORITÉ D&apos;ITINÉRAIRE
        </h2>
        <Card padding="sm">
          <div role="group" aria-label="Mode de priorité" className="flex rounded-[8px] overflow-hidden border border-gray-200">
            {PRIORITY_MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={priorityMode === value}
                onClick={() => setPriorityMode(value)}
                className={[
                  'flex-1 py-2.5 text-sm font-medium transition-colors',
                  priorityMode === value
                    ? 'bg-[#1A5F7A] text-white'
                    : 'bg-white text-[#6B7280] hover:bg-gray-50',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </section>

      {/* Accessibilité */}
      <section aria-label="Accessibilité PMR">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
          ACCESSIBILITÉ
        </h2>
        <p className="mb-2 text-xs text-[#6B7280]">Conformité WCAG 2.1 AA</p>
        <Card padding="sm">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">♿</span>
              <div>
                <p className="font-medium text-[#0F1B2D]">Itinéraires PMR</p>
                <p className="text-xs text-[#6B7280]">Prioriser les trajets accessibles</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pmrEnabled}
              aria-label="Activer les itinéraires PMR"
              onClick={() => setPmrEnabled((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5F7A] focus-visible:ring-offset-2',
                pmrEnabled ? 'bg-[#2D7D46]' : 'bg-gray-200',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  pmrEnabled ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
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
