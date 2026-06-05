import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Empreinte CO₂ — UrbanFlow' };

export default function EmpreintePage() {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#F7F9FC]">
      <div className="text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">🌿</div>
        <h1 className="text-xl font-bold text-[#0F1B2D]">Dashboard CO₂</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Disponible au Sprint 3 — ADEME Base Carbone</p>
      </div>
    </div>
  );
}
