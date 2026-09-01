'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { EcoBadge } from '@/components/profile/EcoBadge';
import { TransportModes } from '@/components/profile/TransportModes';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SaveBar } from '@/components/ui/SaveBar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useApiSwr } from '@/hooks/useApiSwr';
import { useProfile } from '@/hooks/useProfile';
import { useFavoriteAddresses } from '@/hooks/useFavoriteAddresses';
import { usePlaceSuggestions, type PlaceSuggestion } from '@/hooks/usePlaceSuggestions';
import type {
  AuthMeResponse,
  AvatarId,
  PriorityMode,
  TransportMode,
  UpdateProfilePayload,
} from '@urbanflow/types';

interface InitialUser {
  name: string;
  email: string;
  avatarUrl: string | null;
}

// Icône par libellé : simple confort visuel pour les deux libellés les plus
// courants — "Domicile"/"Travail" ne sont plus des concepts distincts en
// base (juste des FavoriteAddress comme les autres, voir migration
// favorite_addresses), donc toute autre entrée retombe sur une épingle générique.
function addressIcon(label: string): string {
  const key = label.trim().toLowerCase();
  if (key === 'domicile' || key === 'maison') return 'ph:house-simple';
  if (key === 'travail' || key === 'bureau') return 'ph:briefcase';
  return 'ph:map-pin';
}

const PRIORITY_MODES: { value: PriorityMode; label: string }[] = [
  { value: 'ecological', label: 'Écologique' },
  { value: 'fast', label: 'Rapide' },
  { value: 'economic', label: 'Économique' },
];

const DEFAULT_MODES: TransportMode[] = ['velo', 'tram', 'metro', 'marche'];

export function ProfileClient({ initialUser }: { initialUser: InitialUser }) {
  // Badge éco-mobile à 3 paliers + total CO₂ économisé depuis l'API
  const { data: me } = useApiSwr<AuthMeResponse>('/auth/me');

  // Paramètres persistés (GET/PUT /users/profile) — écriture optimiste avec
  // rollback automatique en cas d'échec (voir useProfile). Tant que le
  // profil n'est pas encore chargé, on retombe sur des valeurs par défaut
  // cohérentes avec celles de la base (UserProfile.priorityMode = "ecological",
  // les booléens = false) pour éviter un flash visuel incohérent.
  const { profile, updateProfile } = useProfile();
  const priorityMode: PriorityMode = profile?.priorityMode ?? 'ecological';
  const pmrEnabled = profile?.pmrEnabled ?? false;
  const noStairsEnabled = profile?.noStairsEnabled ?? false;
  const voiceGuidanceEnabled = profile?.voiceGuidanceEnabled ?? false;

  // Objectif CO₂ : champ texte local avec sauvegarde différée (debounce), pour
  // ne pas déclencher une requête PUT à chaque frappe. Ne se resynchronise sur
  // `profile.co2Goal` qu'au premier chargement (hasHydrated), pas à chaque
  // revalidation SWR en arrière-plan, sinon une frappe en cours serait écrasée.
  const [co2GoalInput, setCo2GoalInput] = useState('');
  const hasHydratedCo2Goal = useRef(false);
  const co2GoalDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile && !hasHydratedCo2Goal.current) {
      setCo2GoalInput(String(profile.co2Goal));
      hasHydratedCo2Goal.current = true;
    }
  }, [profile]);

  function handleCo2GoalChange(value: string) {
    setCo2GoalInput(value);
    const parsed = Number(value);
    if (value.trim() === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 10000) return;

    if (co2GoalDebounce.current) clearTimeout(co2GoalDebounce.current);
    co2GoalDebounce.current = setTimeout(() => {
      void updateProfile({ co2Goal: parsed });
    }, 600);
  }

  // Section "Modifier le profil" : repliée par défaut, ouverte uniquement en
  // cliquant sur l'en-tête (avatar/nom/email/badge).
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // Nom + avatar : édités en brouillon local, jamais persistés tant que
  // "Enregistrer" n'a pas été pressé (voir SaveBar). `committedName` est la
  // seule source de vérité du nom affiché — la session NextAuth
  // (initialUser.name) n'est jamais re-fetchée après une mise à jour, et
  // `UserProfile` (GET /users/profile) ne renvoie pas `name` (il vit sur
  // `User`, pas `UserProfile`).
  const [committedName, setCommittedName] = useState(initialUser.name);
  const [draftName, setDraftName] = useState(initialUser.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const committedAvatarId: AvatarId | null = profile?.avatarId ?? null;
  const [draftAvatarId, setDraftAvatarId] = useState<AvatarId | null>(committedAvatarId);
  const [savingProfileEdit, setSavingProfileEdit] = useState(false);

  // Réinitialise le brouillon sur les dernières valeurs connues à chaque
  // ouverture du panneau — sans ça, rouvrir après un "Annuler" ou une
  // fermeture sans sauvegarde pourrait réafficher un brouillon périmé.
  // Fait directement au clic (pas dans un effet) : on ne veut réinitialiser
  // qu'à l'ouverture, jamais si committedName/committedAvatarId changent
  // pendant que le panneau reste ouvert (ça écraserait une saisie en cours).
  function toggleProfileEdit() {
    setShowProfileEdit((wasOpen) => {
      if (!wasOpen) {
        setDraftName(committedName);
        setDraftAvatarId(committedAvatarId);
        setNameError(null);
      }
      return !wasOpen;
    });
  }

  const profileEditDirty =
    showProfileEdit && (draftName.trim() !== committedName || draftAvatarId !== committedAvatarId);

  function handleCancelProfileEdit() {
    setDraftName(committedName);
    setDraftAvatarId(committedAvatarId);
    setNameError(null);
  }

  async function handleSaveProfileEdit() {
    const trimmed = draftName.trim();
    if (trimmed.length === 0) {
      setNameError('Le nom ne peut pas être vide');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('100 caractères maximum');
      return;
    }

    const patch: UpdateProfilePayload = {};
    if (trimmed !== committedName) patch.name = trimmed;
    if (draftAvatarId && draftAvatarId !== committedAvatarId) patch.avatarId = draftAvatarId;
    if (Object.keys(patch).length === 0) return;

    setSavingProfileEdit(true);
    try {
      await updateProfile(patch);
      setCommittedName(trimmed);
    } finally {
      setSavingProfileEdit(false);
    }
  }

  // Résolution d'affichage : avatar choisi (enregistré) > photo Google
  // (OAuth) > initiales (gérées par ProfileHeader si avatarUrl est null).
  const resolvedAvatarUrl = committedAvatarId
    ? `/avatars/${committedAvatarId}.svg`
    : initialUser.avatarUrl;

  // Adresses favorites : liste réelle (GET/POST/DELETE /favorite-addresses).
  const { addresses, addAddress, removeAddress } = useFavoriteAddresses();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addAddressError, setAddAddressError] = useState<string | null>(null);
  const { suggestions: addressSuggestions, clear: clearAddressSuggestions } = usePlaceSuggestions(
    selectedPlace ? '' : addressQuery,
  );

  function resetAddForm() {
    setShowAddForm(false);
    setNewLabel('');
    setAddressQuery('');
    setSelectedPlace(null);
    setAddAddressError(null);
    clearAddressSuggestions();
  }

  async function handleAddAddress(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newLabel.trim() || !selectedPlace) {
      setAddAddressError('Choisissez un libellé et une adresse dans la liste de suggestions.');
      return;
    }
    setSavingAddress(true);
    setAddAddressError(null);
    try {
      await addAddress({
        label: newLabel.trim(),
        address: selectedPlace.name,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
      });
      resetAddForm();
    } catch {
      setAddAddressError('Échec de l’enregistrement — réessayez.');
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleRemoveAddress(id: string, label: string) {
    if (!window.confirm(`Supprimer l'adresse "${label}" ?`)) return;
    await removeAddress(id);
  }

  // Formulaire "adresse" considéré "modifié" dès qu'il contient une saisie —
  // rien n'est envoyé au serveur avant l'appui sur "Enregistrer" (SaveBar).
  const addressFormDirty = showAddForm && (newLabel.trim() !== '' || selectedPlace !== null);

  // Une seule barre de confirmation à la fois : priorité au panneau profil
  // s'il est ouvert et modifié (cas rare où les deux le seraient en même
  // temps), sinon le formulaire d'adresse.
  const saveBarMode: 'profile' | 'address' | null = profileEditDirty
    ? 'profile'
    : addressFormDirty
      ? 'address'
      : null;

  return (
    <>
    <div className="flex flex-col gap-4 px-4 pb-6 pt-4">
      {/* Header profil — cliquable : ouvre/ferme "Modifier le profil" */}
      <button
        type="button"
        onClick={toggleProfileEdit}
        aria-expanded={showProfileEdit}
        aria-controls="profil-edit-section"
        className="text-left"
      >
        <Card padding="sm">
          <ProfileHeader name={committedName} email={initialUser.email} avatarUrl={resolvedAvatarUrl} />
          {me && (
            <EcoBadge badgeLevel={me.profile.badgeLevel} totalCo2SavedKg={me.profile.totalCo2SavedKg} />
          )}
        </Card>
      </button>

      {/* Modifier le profil : nom + avatar prédéfini — repliée par défaut,
          rien n'est envoyé au serveur avant "Enregistrer" (voir SaveBar) */}
      {showProfileEdit && (
        <section id="profil-edit-section" aria-label="Modifier le profil">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
            MODIFIER LE PROFIL
          </h2>
          <Card padding="sm" className="flex flex-col gap-4">
            <Input
              label="Nom"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              error={nameError ?? undefined}
              maxLength={100}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-[#0F1B2D] dark:text-text-main">Avatar</p>
              <AvatarPicker selected={draftAvatarId} onSelect={setDraftAvatarId} />
            </div>
          </Card>
        </section>
      )}

      {/* Adresses favorites */}
      <section aria-label="Adresses favorites">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          ADRESSES FAVORITES
        </h2>
        <Card padding="sm">
          <ul className="divide-y divide-gray-100 dark:divide-divider">
            {addresses.map((addr) => (
              <li key={addr.id} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-[#1A5F7A] dark:bg-divider/60 dark:text-primary-content"
                  aria-hidden="true"
                >
                  <Icon icon={addressIcon(addr.label)} width={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F1B2D] dark:text-text-main">{addr.label}</p>
                  <p className="truncate text-sm text-[#6B7280] dark:text-muted">{addr.address}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Supprimer ${addr.label}`}
                  onClick={() => void handleRemoveAddress(addr.id, addr.label)}
                  className="text-[#6B7280] hover:text-red-600 dark:text-muted dark:hover:text-red-400"
                >
                  <Icon icon="ph:trash" width={18} />
                </button>
              </li>
            ))}

            {showAddForm ? (
              <li className="py-3">
                <form
                  onSubmit={(e) => void handleAddAddress(e)}
                  className="flex flex-col gap-2"
                  aria-label="Ajouter une adresse favorite"
                >
                  <Input
                    label="Libellé"
                    placeholder="Domicile, Travail, Chez mes parents…"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={50}
                  />
                  <div className="relative">
                    <Input
                      label="Adresse"
                      placeholder="Rechercher une adresse…"
                      value={selectedPlace ? selectedPlace.name : addressQuery}
                      onChange={(e) => {
                        setAddressQuery(e.target.value);
                        setSelectedPlace(null);
                      }}
                      autoComplete="off"
                    />
                    {!selectedPlace && addressSuggestions.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-lg dark:border-divider dark:bg-surface">
                        {addressSuggestions.map((place, i) => (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlace(place);
                                clearAddressSuggestions();
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-[#0F1B2D] hover:bg-[#F7F9FC] dark:text-text-main dark:hover:bg-divider/40"
                            >
                              {place.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {addAddressError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      {addAddressError}
                    </p>
                  )}
                  {/* Bouton submit invisible : Entrée dans un champ déclenche la
                      même action que la SaveBar en bas d'écran, seule action
                      visible — rien n'est envoyé avant. Libellé volontairement
                      différent de "Enregistrer" (SaveBar) pour rester ciblable
                      sans ambiguïté dans les tests. */}
                  <button type="submit" className="sr-only">
                    Valider le formulaire d&apos;adresse
                  </button>
                </form>
              </li>
            ) : (
              <li>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
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
            )}
          </ul>
        </Card>
      </section>

      {/* Modes de transport */}
      <Card>
        {/* key forcé sur l'id du profil : TransportModes n'observe `initial`
            qu'au montage (useState interne) — remonter le composant une fois
            le profil réellement chargé évite de rester bloqué sur DEFAULT_MODES. */}
        <TransportModes
          key={profile?.id ?? 'loading'}
          initial={profile?.preferredModes ?? DEFAULT_MODES}
          onChange={(modes) => void updateProfile({ preferredModes: modes })}
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
                onClick={() => void updateProfile({ priorityMode: value })}
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
      <section aria-label="Accessibilité PMR">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          ACCESSIBILITÉ
        </h2>
        <p className="mb-2 text-xs text-[#6B7280] dark:text-muted">Conformité WCAG 2.1 AA</p>
        <Card padding="sm">
          <div className="divide-y divide-gray-100 dark:divide-divider">
            <AccessibilityToggle
              icon="ph:wheelchair"
              label="Itinéraires PMR"
              description="Prioriser les trajets accessibles"
              checked={pmrEnabled}
              ariaLabel="Activer les itinéraires PMR"
              onToggle={() => void updateProfile({ pmrEnabled: !pmrEnabled })}
            />
            <AccessibilityToggle
              icon="ph:stairs"
              label="Sans marches ni escaliers"
              description="Éviter les trajets avec dénivelé"
              checked={noStairsEnabled}
              ariaLabel="Activer les itinéraires sans marches ni escaliers"
              onToggle={() => void updateProfile({ noStairsEnabled: !noStairsEnabled })}
            />
            <AccessibilityToggle
              icon="ph:speaker-high"
              label="Guidage vocal"
              description="Instructions annoncées à voix haute"
              checked={voiceGuidanceEnabled}
              ariaLabel="Activer le guidage vocal"
              onToggle={() => void updateProfile({ voiceGuidanceEnabled: !voiceGuidanceEnabled })}
            />
          </div>
        </Card>
      </section>

      {/* Objectif CO₂ mensuel */}
      <section aria-label="Objectif CO2 mensuel">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          OBJECTIF CO&#8322; MENSUEL
        </h2>
        <Card padding="sm">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={10000}
            step={1}
            label="Kilogrammes de CO₂ économisés visés par mois"
            value={co2GoalInput}
            onChange={(e) => handleCo2GoalChange(e.target.value)}
          />
        </Card>
      </section>

      {/* Application */}
      <section aria-label="Application">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
          APPLICATION
        </h2>
        <Card padding="sm">
          <div className="divide-y divide-gray-100 dark:divide-divider">
            <ThemeToggle />
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

    <SaveBar
      visible={saveBarMode !== null}
      saving={saveBarMode === 'profile' ? savingProfileEdit : savingAddress}
      onSave={() => {
        if (saveBarMode === 'profile') void handleSaveProfileEdit();
        else if (saveBarMode === 'address') void handleAddAddress();
      }}
      onCancel={() => {
        if (saveBarMode === 'profile') handleCancelProfileEdit();
        else if (saveBarMode === 'address') resetAddForm();
      }}
    />
    </>
  );
}

interface AccessibilityToggleProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  ariaLabel: string;
  onToggle: () => void;
}

function AccessibilityToggle({
  icon,
  label,
  description,
  checked,
  ariaLabel,
  onToggle,
}: AccessibilityToggleProps) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-100 text-[#1A5F7A] dark:bg-divider/60 dark:text-primary-content"
          aria-hidden="true"
        >
          <Icon icon={icon} width={18} />
        </span>
        <div>
          <p className="font-medium text-[#0F1B2D] dark:text-text-main">{label}</p>
          <p className="text-xs text-[#6B7280] dark:text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={onToggle}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5F7A] focus-visible:ring-offset-2 dark:focus-visible:ring-primary-content',
          checked ? 'bg-[#2D7D46]' : 'bg-gray-200 dark:bg-divider',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
