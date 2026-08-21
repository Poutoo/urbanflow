import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  // 1re connexion via Google : le consentement CGU/confidentialité n'a pas encore
  // été recueilli (contrairement à l'inscription par formulaire) — écran dédié
  // avant d'accéder à l'app, une seule fois (voir /bienvenue-google).
  if ((session as { isNewUser?: boolean }).isNewUser) redirect('/bienvenue-google');

  return <AppLayout>{children}</AppLayout>;
}
