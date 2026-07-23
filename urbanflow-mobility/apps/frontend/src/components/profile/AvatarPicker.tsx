import { AVATAR_IDS, type AvatarId } from '@urbanflow/types';

interface AvatarPickerProps {
  selected: AvatarId | null;
  onSelect: (id: AvatarId) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div role="radiogroup" aria-label="Choisir un avatar" className="grid grid-cols-5 gap-2">
      {AVATAR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={selected === id}
          aria-label={`Avatar ${id}`}
          onClick={() => onSelect(id)}
          className={[
            'flex items-center justify-center rounded-full p-0.5 transition-shadow',
            selected === id ? 'ring-2 ring-[#1A5F7A] ring-offset-2 dark:ring-primary-content' : '',
          ].join(' ')}
        >
          <img src={`/avatars/${id}.svg`} alt="" width={44} height={44} className="rounded-full" />
        </button>
      ))}
    </div>
  );
}
