import { Metadata } from 'next';
import Link from 'next/link';
import { LegalAccordion } from '@/components/legal/LegalAccordion';
import { getLegalContent } from '@/lib/legalContent';

export const metadata: Metadata = {
  title: 'Aide & confidentialité — UrbanFlow Mobility',
};

export default function AideConfidentialitePage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-bg">
      <header className="bg-[#1A5F7A] px-6 py-5">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <Link
            href="/profil"
            className="text-sm font-medium text-white/90 underline-offset-2 hover:underline"
          >
            &larr; Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-[#0F1B2D] dark:text-text-main">
          Aide & confidentialité
        </h1>

        <section aria-label="Documents légaux" className="mb-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
            DOCUMENTS LÉGAUX
          </h2>
          <div className="divide-y divide-gray-100 rounded-[8px] border border-gray-200 bg-white px-4 dark:divide-divider dark:border-divider dark:bg-surface">
            <LegalAccordion title="Mentions légales" content={getLegalContent('mentions-legales')} />
            <LegalAccordion
              title="Politique de confidentialité"
              content={getLegalContent('politique-confidentialite')}
            />
            <LegalAccordion
              title="Conditions d'utilisation"
              content={getLegalContent('conditions-utilisation')}
            />
          </div>
        </section>

        <section aria-label="Questions fréquentes">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
            QUESTIONS FRÉQUENTES
          </h2>
          <div className="rounded-[8px] border border-gray-200 bg-white p-4 text-sm text-[#6B7280] dark:border-divider dark:bg-surface dark:text-muted">
            Cette section arrivera bientôt.
          </div>
        </section>
      </main>
    </div>
  );
}
