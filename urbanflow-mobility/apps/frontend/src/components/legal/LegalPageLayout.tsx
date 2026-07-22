import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface LegalPageLayoutProps {
  title: string;
  content: string;
}

// La 1re ligne des .md est déjà "# Titre" — on l'ignore ici pour ne pas
// dupliquer le h1 rendu depuis la prop `title`, et garder h1 -> h2 -> h3 sans saut.
function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\r?\n/, '');
}

export function LegalPageLayout({ title, content }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F9FC]">
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
          <h1 className="mb-4 text-2xl font-bold text-[#0F1B2D]">{title}</h1>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="mb-3 mt-8 text-lg font-bold text-[#0F1B2D]">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-6 text-base font-semibold text-[#0F1B2D]">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-base leading-relaxed text-[#0F1B2D]">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 ml-5 list-disc space-y-1.5 text-base text-[#0F1B2D]">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-base text-[#0F1B2D]">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-[#0F1B2D]">{children}</strong>
              ),
              em: ({ children }) => <em className="text-[#6B7280]">{children}</em>,
              hr: () => <hr className="my-6 border-gray-200" />,
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto rounded-[8px] border border-gray-200">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-[#1A5F7A]/10">{children}</thead>,
              th: ({ children }) => (
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-[#0F1B2D]">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-gray-100 px-3 py-2 align-top text-[#0F1B2D]">
                  {children}
                </td>
              ),
              tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
              code: ({ children }) => (
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-[#0F1B2D]">
                  {children}
                </code>
              ),
            }}
          >
            {stripLeadingH1(content)}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}

export type { LegalPageLayoutProps };
