import { Metadata } from 'next';
import { EmpreinteClient } from './EmpreinteClient';

export const metadata: Metadata = { title: 'Empreinte CO₂ — UrbanFlow' };

export default function EmpreintePage() {
  return <EmpreinteClient />;
}
