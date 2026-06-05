import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Carte — UrbanFlow' };

export default function CartePage() {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#F7F9FC]">
      <div className="text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">🗺️</div>
        <h1 className="text-xl font-bold text-[#0F1B2D]">Carte interactive</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Disponible au Sprint 2 — intégration Leaflet.js</p>
      </div>
    </div>
  );
}
