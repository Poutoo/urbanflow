'use client';

import { useId, useState } from 'react';
import { LegalMarkdown, stripLeadingH1 } from './LegalMarkdown';

interface LegalAccordionProps {
  title: string;
  content: string;
}

export function LegalAccordion({ title, content }: LegalAccordionProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <h2 className="text-base">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 py-3 text-left font-medium text-[#0F1B2D] dark:text-text-main"
        >
          {title}
          <span
            aria-hidden="true"
            className={[
              'text-[#6B7280] transition-transform dark:text-muted',
              open ? 'rotate-90' : '',
            ].join(' ')}
          >
            ›
          </span>
        </button>
      </h2>
      {open ? (
        <div id={panelId} role="region" aria-label={title} className="pb-4">
          <LegalMarkdown content={stripLeadingH1(content)} headingLevel={3} />
        </div>
      ) : null}
    </div>
  );
}
