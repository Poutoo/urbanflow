import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleButton } from './GoogleButton';

const mockSignIn = jest.fn().mockResolvedValue(undefined);
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe('GoogleButton', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
  });

  it('est rendu avec le texte correct', () => {
    render(<GoogleButton />);
    expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeInTheDocument();
  });

  it('appelle signIn("google") au clic', async () => {
    const user = userEvent.setup();
    render(<GoogleButton />);

    await user.click(screen.getByRole('button', { name: /continuer avec google/i }));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/carte' });
  });
});
