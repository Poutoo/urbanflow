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

    ...require('next-pwa/cache'),
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@urbanflow/types'],
};

module.exports = withPWA(nextConfig);
