interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC] dark:bg-bg">
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
          <img src="/logo-badge.png" alt="" className="h-10 w-10 rounded-[8px]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/90">
              UrbanFlow
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/80">MOBILITY</p>
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
