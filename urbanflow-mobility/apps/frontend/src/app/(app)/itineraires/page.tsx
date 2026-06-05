import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Itinéraires — UrbanFlow' };

export default function ItinerairesPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#F7F9FC]">
      <div className="text-center">
        <div className="mb-4 text-6xl" aria-hidden="true">🚌</div>
        <h1 className="text-xl font-bold text-[#0F1B2D]">Planificateur multimodal</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Disponible au Sprint 2 — intégration Navitia.io</p>
      </div>
    </div>
  );
}
