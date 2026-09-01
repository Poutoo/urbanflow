'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';

// Clé par défaut de next-themes (non surchargée via `storageKey` dans
// ThemeProvider) — lue directement pour savoir si CET appareil a déjà une
// préférence, sans dépendre d'un état interne non exposé par next-themes.
const THEME_STORAGE_KEY = 'theme';

/**
 * Composant monté une fois dans le layout racine (aucun rendu). Ne fait
 * qu'une chose : si l'utilisateur se connecte sur un appareil qui n'a
 * jamais eu de préférence de thème locale, reprend le dernier choix connu
 * côté backend (`darkModeEnabled`) plutôt que de retomber sur "system".
 *
 * Ne s'exécute qu'une fois par montage et ne touche jamais au thème si une
 * préférence locale existe déjà — le thème reste piloté par
 * next-themes/localStorage en temps normal (fonctionnel hors-ligne), ce
 * composant ne fait que l'amorcer sur un nouvel appareil.
 */
export function ThemeBackendSync() {
  const { setTheme } = useTheme();
  const { profile } = useProfile();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !profile || typeof window === 'undefined') return;
    hydrated.current = true;

    const hasLocalPreference = window.localStorage.getItem(THEME_STORAGE_KEY) !== null;
    if (!hasLocalPreference) {
      setTheme(profile.darkModeEnabled ? 'dark' : 'light');
    }
  }, [profile, setTheme]);

  return null;
}
