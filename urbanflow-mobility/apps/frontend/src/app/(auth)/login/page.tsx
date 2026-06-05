import { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Connexion — UrbanFlow Mobility',
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <GoogleButton />

      <div className="flex items-center gap-3">
        <hr className="flex-1 border-gray-200" aria-hidden="true" />
        <span className="text-sm text-[#6B7280]">ou</span>
        <hr className="flex-1 border-gray-200" aria-hidden="true" />
      </div>

      <LoginForm />

      <footer className="mt-auto flex flex-col items-center gap-3 pb-4 text-center">
        <p className="text-sm text-[#6B7280]">
          Nouveau sur UrbanFlow ?{' '}
          <Link
            href="/register"
            className="font-semibold text-[#1A5F7A] underline-offset-2 hover:underline"
          >
            Inscrivez-vous
          </Link>
        </p>
        <p className="text-xs text-[#6B7280]">
          En continuant, vous acceptez les Conditions d&apos;utilisation et la Politique de
          confidentialité d&apos;UrbanFlow.
        </p>
      </footer>
    </AuthLayout>
  );
}
