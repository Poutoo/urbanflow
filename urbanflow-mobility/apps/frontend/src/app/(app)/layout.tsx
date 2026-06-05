import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return <AppLayout>{children}</AppLayout>;
}
