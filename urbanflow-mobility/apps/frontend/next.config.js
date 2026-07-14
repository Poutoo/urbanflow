const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Le SW interfère avec le hot-reload de webpack en dev — actif seulement en prod.
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [...require('next-pwa/cache')],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@urbanflow/types'],
};

module.exports = withPWA(nextConfig);
