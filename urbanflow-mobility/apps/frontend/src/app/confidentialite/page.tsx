import { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { getLegalContent } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — UrbanFlow Mobility',
};

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      content={getLegalContent('politique-confidentialite')}
    />
  );
}
