'use client';

import { useEffect } from 'react';

/**
 * next-pwa (v5.6) injecte son script d'enregistrement automatique via le
 * mécanisme Pages Router (_document.js), absent avec l'App Router — le
 * Service Worker généré (public/sw.js) n'est donc jamais activé sans cet
 * enregistrement manuel côté client.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.error('Échec de l’enregistrement du Service Worker :', err);
    });
  }, []);

  return null;
}
