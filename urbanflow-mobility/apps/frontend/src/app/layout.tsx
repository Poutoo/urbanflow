import type { Metadata, Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'UrbanFlow Mobility',
  description: 'Planifiez vos trajets multimodaux et suivez votre empreinte CO₂',
  manifest: '/manifest.json',
  icons: { apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#1A5F7A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
