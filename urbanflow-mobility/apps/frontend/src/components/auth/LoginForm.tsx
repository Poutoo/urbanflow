'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const schema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type FormValues = z.infer<typeof schema>;

interface EyeIconProps {
  open: boolean;
}

const EyeIcon = ({ open }: EyeIconProps) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError('Email ou mot de passe incorrect');
    } else {
      router.push('/carte');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError ? (
        <div role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {serverError}
        </div>
      ) : null}

      <Input
        label="Adresse e-mail"
        type="email"
        placeholder="vous@exemple.fr"
        autoComplete="email"
        icon={<Icon icon="ph:envelope-simple" width={16} />}
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#0F1B2D] dark:text-text-main">Mot de passe</span>
          <a
            href="/forgot-password"
            className="text-sm font-medium text-[#1A5F7A] underline-offset-2 hover:underline dark:text-primary-content"
          >
            Oublié ?
          </a>
        </div>
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="current-password"
          icon={<Icon icon="ph:lock-simple" width={16} className="text-[#1A5F7A] dark:text-primary-content" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="-m-1 p-1"
            >
              <EyeIcon open={showPassword} />
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button type="submit" size="lg" loading={isSubmitting}>
        Se connecter
      </Button>
    </form>
  );
}
