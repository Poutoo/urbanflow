import { ChevronRightIcon } from './icons';

interface ProfileHeaderProps {
  name: string;
  email: string;
  avatarUrl: string | null;
  isEcoMobile?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileHeader({ name, email, avatarUrl, isEcoMobile = false }: ProfileHeaderProps) {
  const initials = getInitials(name);

  return (
    <div className="flex items-center gap-4 p-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatarUrl ? (
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
        <p className="truncate font-semibold text-[#0F1B2D]">{name}</p>
        <p className="truncate text-sm text-[#6B7280]">{email}</p>
        {isEcoMobile ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-[999px] bg-[#2D7D46]/10 px-2 py-0.5 text-xs font-medium text-[#2D7D46]">
            <span aria-hidden="true">🌿</span> Éco-mobile
          </span>
        ) : null}
      </div>

      <ChevronRightIcon className="flex-shrink-0 text-[#6B7280]" />
    </div>
  );
}
