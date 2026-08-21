'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, id, className = '', ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-[#0F1B2D] dark:text-text-main">
            {label}
          </label>
        ) : null}
        <div className="relative flex items-center">
          {icon ? (
            <span className="pointer-events-none absolute left-3 text-[#6B7280] dark:text-muted" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={error ? `${inputId}-error` : undefined}
            aria-invalid={error ? true : undefined}
            className={[
              'w-full rounded-[8px] border bg-white py-3 text-[#0F1B2D] placeholder:text-[#6B7280]',
              'dark:bg-surface dark:text-text-main dark:placeholder:text-muted',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#1A5F7A] focus:border-transparent dark:focus:ring-primary-content',
              icon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              error ? 'border-red-500' : 'border-gray-200 dark:border-divider',
              className,
            ].join(' ')}
            {...props}
          />
          {rightIcon ? (
            <span className="absolute right-3 text-[#6B7280] dark:text-muted">{rightIcon}</span>
          ) : null}
        </div>
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
