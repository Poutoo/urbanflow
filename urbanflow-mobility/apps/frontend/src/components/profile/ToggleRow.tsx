import { Icon } from '@iconify/react';

interface ToggleRowProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

export function ToggleRow({ icon, label, description, checked, onToggle }: ToggleRowProps) {
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
        aria-label={label}
        onClick={onToggle}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A5F7A] focus-visible:ring-offset-2 dark:focus-visible:ring-primary-content',
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
