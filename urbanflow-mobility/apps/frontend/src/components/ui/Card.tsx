import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6' };

  return (
    <div
      className={`rounded-[8px] bg-white shadow-sm dark:bg-surface dark:shadow-none dark:border dark:border-divider ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
