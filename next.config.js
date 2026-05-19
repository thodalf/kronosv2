/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Headers pour servir correctement les fichiers PWA
  async headers() {
    return [
      {
        // Service worker : doit pouvoir être réenregistré à chaque déploiement
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          // Le manifest peut être mis en cache plus longtemps
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
