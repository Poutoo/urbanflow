'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

export function BienvenueGoogleClient() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = (session as { accessToken?: string } | null)?.accessToken;

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/accept-terms`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();

      await update({ termsAccepted: true });
      router.push('/carte');
      router.refresh();
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC] px-6 py-10 dark:bg-bg">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-[#0F1B2D] dark:text-text-main">
            Bienvenue sur UrbanFlow
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-muted">
            Avant de continuer, merci de confirmer que vous acceptez nos conditions.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </div>
        ) : null}

        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="accept-terms-google"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#1A5F7A] focus:ring-2 focus:ring-[#1A5F7A] dark:border-divider dark:bg-surface dark:focus:ring-primary-content"
          />
          <label htmlFor="accept-terms-google" className="text-sm text-[#0F1B2D] dark:text-text-main">
            J&apos;ai lu et j&apos;accepte les{' '}
            <Link
              href="/cgu"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline dark:text-primary-content"
            >
              Conditions d&apos;utilisation
            </Link>{' '}
            et la{' '}
            <Link
              href="/confidentialite"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline dark:text-primary-content"
            >
              Politique de confidentialité
            </Link>
          </label>
        </div>

        <Button
          size="lg"
          loading={submitting}
          disabled={!accepted || submitting}
          onClick={handleConfirm}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
