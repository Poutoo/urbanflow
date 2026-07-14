const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Le SW interfère avec le hot-reload de webpack en dev — actif seulement en prod.
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // StaleWhileRevalidate — assets statiques (chunks JS/CSS Next.js + polices
    // Google Fonts) : sert immédiatement depuis le cache puis revalide en tâche
    // de fond, ces fichiers étant versionnés/hashés et peu volatils.
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // NetworkFirst — données de trajet/API (GET /co2/*, /auth/me, /gbfs/*,
    // /places...). Le backend sert déjà ces réponses via son propre cache
    // Redis quand il est en ligne ; ce cache Workbox ne fait que rejouer la
    // DERNIÈRE réponse réussie côté navigateur si le réseau est indisponible
    // (fallback offline). Ne s'applique qu'aux requêtes GET — les écritures
    // (login, co2/record, routes/search en POST) ne sont pas mises en cache,
    // ce qui est le comportement voulu pour des mutations.
    {
      urlPattern: ({ url }) => url.pathname.includes('/api/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-data',
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    ...require('next-pwa/cache'),
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@urbanflow/types'],
};

module.exports = withPWA(nextConfig);
