import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = { title: 'Profil — UrbanFlow' };

export default async function ProfilPage() {
  const session = await auth();

  return (
    <ProfileClient
      initialUser={{
        name: session?.user?.name ?? 'Utilisateur',
        email: session?.user?.email ?? '',
        avatarUrl: session?.user?.image ?? null,
      }}
    />
  );
}
