interface IconProps {
  className?: string;
}

export const ChevronRightIcon = ({ className = '' }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
