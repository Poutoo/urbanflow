import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// La 1re ligne des .md est déjà "# Titre" — à ignorer quand ce titre est déjà
// rendu séparément (h1 de page, ou résumé d'accordéon), pour garder une
// hiérarchie de titres sans saut.
export function stripLeadingH1(markdown: string): string {
  return markdown.replace(/^#\s+.+\r?\n/, '');
}

interface LegalMarkdownProps {
  content: string;
  /** Niveau du 1er titre markdown (##) : h2 sur une page dédiée, h3 dans un
   * accordéon (dont le résumé occupe déjà le niveau h2). */
  headingLevel?: 2 | 3;
}

export function LegalMarkdown({ content, headingLevel = 2 }: LegalMarkdownProps) {
  const SectionHeading = headingLevel === 2 ? 'h2' : 'h3';
  const SubHeading = headingLevel === 2 ? 'h3' : 'h4';

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <SectionHeading className="mb-3 mt-8 text-lg font-bold text-[#0F1B2D] first:mt-0 dark:text-text-main">
            {children}
          </SectionHeading>
        ),
        h3: ({ children }) => (
          <SubHeading className="mb-2 mt-6 text-base font-semibold text-[#0F1B2D] dark:text-text-main">
            {children}
          </SubHeading>
        ),
        p: ({ children }) => (
          <p className="mb-4 text-base leading-relaxed text-[#0F1B2D] dark:text-text-main">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-4 ml-5 list-disc space-y-1.5 text-base text-[#0F1B2D] dark:text-text-main">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-4 ml-5 list-decimal space-y-1.5 text-base text-[#0F1B2D] dark:text-text-main">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            className="font-medium text-[#1A5F7A] underline-offset-2 hover:underline dark:text-primary-content"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[#0F1B2D] dark:text-text-main">{children}</strong>
        ),
        em: ({ children }) => <em className="text-[#6B7280] dark:text-muted">{children}</em>,
        hr: () => <hr className="my-6 border-gray-200 dark:border-divider" />,
        table: ({ children }) => (
          <div className="mb-4 overflow-x-auto rounded-[8px] border border-gray-200 dark:border-divider">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-primary/10">{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-[#0F1B2D] dark:border-divider dark:text-text-main">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-gray-100 px-3 py-2 align-top text-[#0F1B2D] dark:border-divider dark:text-text-main">
            {children}
          </td>
        ),
        tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-[#0F1B2D] dark:bg-divider/60 dark:text-text-main">
            {children}
          </code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
