const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Le SW interfère avec le hot-reload de webpack en dev — actif seulement en prod.
  disable: process.env.NODE_ENV === 'development',
  // Ces manifests internes à Next.js (App Router) ne sont pas servis publiquement
  // sous /_next/ — next-pwa les ajoute pourtant à la précache auto-générée, ce qui
  // produit un 404 et fait échouer l'installation du service worker
  // (bad-precaching-response). On les exclut explicitement.
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/, /_buildManifest\.js$/, /_ssgManifest\.js$/],
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

    // CacheFirst — tuiles de carte Leaflet (CartoDB). Des images immuables par
    // {z}/{x}/{y} : une fois chargées, elles ne changent plus, donc pas besoin
    // de revalider — sert direct depuis le cache si présent, sinon réseau.
    {
      urlPattern: /^https:\/\/[a-z0-9-]+\.basemaps\.cartocdn\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'map-tiles',
        expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    ...require('next-pwa/cache'),
  ],
});

// En dev, le CSP ci-dessous casserait le hot-reload webpack (eval, websocket HMR) —
// on ne l'applique qu'en prod, où le frontend n'a de toute façon pas besoin de ces
// mécanismes de dev.
function buildCsp() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
  const apiOrigin = new URL(apiUrl).origin

  return [
    "default-src 'self'",
    `img-src 'self' data: https://*.basemaps.cartocdn.com https://lh3.googleusercontent.com`,
    `connect-src 'self' ${apiOrigin}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "script-src 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Content-Security-Policy', value: buildCsp() }]
    : []),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@urbanflow/types'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

module.exports = withPWA(nextConfig);
