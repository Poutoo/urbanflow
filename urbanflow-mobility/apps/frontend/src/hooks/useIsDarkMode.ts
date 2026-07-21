'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * true seulement après hydratation côté client et si le thème résolu est
 * "dark" — resolvedTheme n'est connu qu'une fois le localStorage/la
 * préférence système lus, donc on renvoie false avant le montage pour éviter
 * un flash de mauvaises couleurs pendant le rendu serveur.
 */
export function useIsDarkMode(): boolean {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted && resolvedTheme === 'dark';
}
