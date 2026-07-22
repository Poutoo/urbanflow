import { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { getLegalContent } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: "Conditions d'utilisation — UrbanFlow Mobility",
};

export default function CguPage() {
  return (
    <LegalPageLayout title="Conditions d'utilisation" content={getLegalContent('conditions-utilisation')} />
  );
}
