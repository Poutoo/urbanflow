import { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { getLegalContent } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: 'Mentions légales — UrbanFlow Mobility',
};

export default function MentionsLegalesPage() {
  return <LegalPageLayout title="Mentions légales" content={getLegalContent('mentions-legales')} />;
}
