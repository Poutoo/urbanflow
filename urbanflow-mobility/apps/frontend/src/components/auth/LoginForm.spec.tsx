import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn().mockResolvedValue({ error: null }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

describe('LoginForm', () => {
  it("affiche les erreurs de validation si le formulaire est soumis vide", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/adresse email invalide/i)).toBeInTheDocument();
    });
  });

  it("affiche une erreur si l'email a un format invalide", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByPlaceholderText('vous@exemple.fr'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByText(/adresse email invalide/i)).toBeInTheDocument();
    });
  });

  it("affiche le champ mot de passe en texte quand on clique sur l'œil", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByLabelText(/afficher le mot de passe/i));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it("affiche une erreur serveur quand les credentials sont incorrects", async () => {
    const { signIn } = await import('next-auth/react');
    (signIn as jest.Mock).mockResolvedValueOnce({ error: 'CredentialsSignin' });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByPlaceholderText('vous@exemple.fr'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email ou mot de passe incorrect/i);
    });
  });
});
