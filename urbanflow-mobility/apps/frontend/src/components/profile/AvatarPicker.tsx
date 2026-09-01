'use client';

import { AVATAR_IDS, type AvatarId } from '@urbanflow/types';

interface AvatarPickerProps {
  selected: AvatarId | null;
  onSelect: (id: AvatarId) => void;
}

/**
 * Grille des 8 avatars prédéfinis (apps/frontend/public/avatars/*.svg).
 * Pas d'upload : on ne persiste jamais qu'une clé parmi AVATAR_IDS (source
 * partagée avec la validation serveur, voir update-profile.dto.ts).
 */
export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div
      role="group"
      aria-label="Choisir un avatar"
      className="grid grid-cols-4 gap-3"
    >
      {AVATAR_IDS.map((id) => {
        const isSelected = id === selected;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Avatar ${id.split('-')[1]}`}
            onClick={() => onSelect(id)}
            className={[
              'flex items-center justify-center rounded-full p-0.5 transition-shadow',
              isSelected
                ? 'ring-2 ring-[#1A5F7A] ring-offset-2 dark:ring-primary-content dark:ring-offset-surface'
                : 'ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-divider',
            ].join(' ')}
          >
            <img src={`/avatars/${id}.svg`} alt="" width={48} height={48} className="h-12 w-12 rounded-full" />
          </button>
        );
      })}
    </div>
  );
}
