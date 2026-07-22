import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BienvenueGoogleClient } from './BienvenueGoogleClient';

export const metadata: Metadata = {
  title: 'Bienvenue — UrbanFlow Mobility',
};

export default async function BienvenueGooglePage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!(session as { isNewUser?: boolean }).isNewUser) redirect('/carte');

  return <BienvenueGoogleClient />;
}
