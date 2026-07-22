'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'google';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, children, className = '', disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-[#1A5F7A] text-white hover:bg-[#164f66] active:bg-[#11404f] focus-visible:ring-[#1A5F7A] dark:focus-visible:ring-primary-content rounded-[24px]',
      secondary:
        'bg-white border border-gray-200 text-[#6B7280] hover:bg-gray-50 dark:bg-surface dark:border-divider dark:text-muted dark:hover:bg-divider/40 rounded-[8px]',
      ghost:
        'bg-transparent text-[#1A5F7A] hover:bg-[#1A5F7A]/10 dark:text-primary-content dark:hover:bg-primary-content/10 rounded-[8px]',
      google:
        'bg-white border border-gray-200 text-[#0F1B2D] hover:bg-gray-50 shadow-sm dark:bg-surface dark:border-divider dark:text-text-main dark:hover:bg-divider/40 rounded-[8px]',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg w-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        aria-disabled={disabled ?? loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
