import Link from 'next/link';
import { LegalMarkdown, stripLeadingH1 } from './LegalMarkdown';

interface LegalPageLayoutProps {
  title: string;
  content: string;
}

export function LegalPageLayout({ title, content }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-bg">
      <header className="bg-[#1A5F7A] px-6 py-5">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-white/90 underline-offset-2 hover:underline"
          >
            &larr; Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-8">
        <article className="legal-content">
          <h1 className="mb-4 text-2xl font-bold text-[#0F1B2D] dark:text-text-main">{title}</h1>
          <LegalMarkdown content={stripLeadingH1(content)} />
        </article>
      </main>
    </div>
  );
}

export type { LegalPageLayoutProps };
