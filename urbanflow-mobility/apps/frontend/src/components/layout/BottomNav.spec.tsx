import { render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/carte'),
}));

describe('BottomNav', () => {
  it('affiche les 4 onglets de navigation', () => {
    render(<BottomNav />);
    expect(screen.getByRole('link', { name: /carte/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /itinéraires/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /empreinte/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profil/i })).toBeInTheDocument();
  });

  it("marque l'onglet actif avec aria-current='page'", () => {
    render(<BottomNav />);
    const carteLink = screen.getByRole('link', { name: /carte/i });
    expect(carteLink).toHaveAttribute('aria-current', 'page');
  });

  it("ne marque pas les autres onglets comme actifs", () => {
    render(<BottomNav />);
    const profilLink = screen.getByRole('link', { name: /profil/i });
    expect(profilLink).not.toHaveAttribute('aria-current', 'page');
  });
});
