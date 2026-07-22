'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LegalFooter } from '@/components/legal/LegalFooter';
import { registerUser } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100),
  email: z.string().email('Adresse email invalide'),
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .max(128, 'Maximum 128 caractères'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions d'utilisation et la politique de confidentialité",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptTerms: false },
  });

  const acceptTerms = watch('acceptTerms');

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      router.push('/login?registered=1');
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setServerError(message ?? "Une erreur s'est produite. Veuillez réessayer.");
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-[#0F1B2D]">Créer un compte</h2>

      {serverError ? (
        <div role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nom complet"
          type="text"
          placeholder="Camille Laurent"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Adresse e-mail"
          type="email"
          placeholder="vous@exemple.fr"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="accept-terms"
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#1A5F7A] focus:ring-2 focus:ring-[#1A5F7A]"
            {...register('acceptTerms')}
          />
          <label htmlFor="accept-terms" className="text-sm text-[#0F1B2D]">
            J&apos;ai lu et j&apos;accepte les{' '}
            <Link
              href="/cgu"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline"
            >
              Conditions d&apos;utilisation
            </Link>{' '}
            et la{' '}
            <Link
              href="/confidentialite"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline"
            >
              Politique de confidentialité
            </Link>
          </label>
        </div>
        {errors.acceptTerms ? (
          <p role="alert" className="-mt-2 text-sm text-red-600">
            {errors.acceptTerms.message}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={isSubmitting} disabled={!acceptTerms || isSubmitting}>
          Créer mon compte
        </Button>
      </form>

      <p className="text-center text-sm text-[#6B7280]">
        Déjà un compte ?{' '}
        <Link
          href="/login"
          className="font-semibold text-[#1A5F7A] underline-offset-2 hover:underline"
        >
          Se connecter
        </Link>
      </p>

      <LegalFooter />
    </AuthLayout>
  );
}
