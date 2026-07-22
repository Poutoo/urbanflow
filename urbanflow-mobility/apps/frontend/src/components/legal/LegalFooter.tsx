import Link from 'next/link';

export function LegalFooter() {
  return (
    <nav aria-label="Informations légales" className="flex justify-center gap-4 pb-2 text-xs">
      <Link href="/mentions-legales" className="text-[#6B7280] underline-offset-2 hover:underline">
        Mentions légales
      </Link>
      <Link href="/confidentialite" className="text-[#6B7280] underline-offset-2 hover:underline">
        Confidentialité
      </Link>
      <Link href="/cgu" className="text-[#6B7280] underline-offset-2 hover:underline">
        CGU
      </Link>
    </nav>
  );
}
