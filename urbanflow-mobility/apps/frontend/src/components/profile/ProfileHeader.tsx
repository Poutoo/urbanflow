import { ChevronRightIcon } from './icons';
import type { AvatarId } from '@urbanflow/types';

interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  avatarId?: AvatarId | null;
  onClick?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileHeader({ name, email, avatarUrl, avatarId, onClick }: ProfileHeaderProps) {
  const initials = getInitials(name);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? 'Modifier le profil' : undefined}
      className="flex w-full items-center gap-4 p-4 text-left disabled:cursor-default"
    >
      {/* Avatar : avatar prédéfini prioritaire sur la photo de compte (Google), puis initiales */}
      <div className="flex-shrink-0">
        {avatarId ? (
          <img
            src={`/avatars/${avatarId}.svg`}
            alt={`Avatar de ${name}`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full"
          />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Avatar de ${name}`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2D7D46] text-lg font-bold text-white"
          >
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-[#0F1B2D] dark:text-text-main">{name}</p>
        <p className="truncate text-sm text-[#6B7280] dark:text-muted">{email}</p>
      </div>

      {onClick && <ChevronRightIcon className="flex-shrink-0 text-[#6B7280] dark:text-muted" />}
    </button>
  );
}
