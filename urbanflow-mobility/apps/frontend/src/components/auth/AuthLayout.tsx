interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC]">
      {/* Header teal — fidèle maquette 01-connexion.png */}
      <header className="relative overflow-hidden bg-[#1A5F7A] px-6 pb-10 pt-14">
        {/* Cercle décoratif flou */}
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-6 -right-4 h-24 w-24 rounded-full bg-white/10"
        />

        <div className="relative flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              UrbanFlow
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">MOBILITY</p>
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-white">Bon retour.</h1>
        <p className="text-sm text-white/80">
          Toute votre ville en un trajet. Vélo,
          <br />
          tram, bus, métro et covoiturage réunis.
        </p>
      </header>

      {/* Formulaire */}
      <main className="flex flex-1 flex-col gap-6 px-6 py-8">{children}</main>
    </div>
  );
}
