'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import type { TransportMode } from '@urbanflow/types';

const ALL_MODES: TransportMode[] = [
  'velo',
  'tram',
  'metro',
  'bus',
  'trottinette',
  'marche',
  'covoiturage',
];

interface TransportModesProps {
  initial: TransportMode[];
  onChange: (modes: TransportMode[]) => void;
}

export function TransportModes({ initial, onChange }: TransportModesProps) {
  const [selected, setSelected] = useState<Set<TransportMode>>(new Set(initial));

  const toggle = (mode: TransportMode) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      onChange(Array.from(next));
      return next;
    });
  };

  return (
    <section aria-label="Modes de transport préférés">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-muted">
        MES MODES PRÉFÉRÉS
      </h2>
      <p className="mb-3 text-xs text-[#6B7280] dark:text-muted">Priorisés dans vos itinéraires</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sélection des modes de transport">
        {ALL_MODES.map((mode) => (
          <Badge
            key={mode}
            mode={mode}
            selected={selected.has(mode)}
            onClick={() => toggle(mode)}
          />
        ))}
      </div>
    </section>
  );
}
