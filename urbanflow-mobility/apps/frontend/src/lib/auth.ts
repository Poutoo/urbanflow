import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL']}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });

          if (!res.ok) return null;

          const data = (await res.json()) as {
            user: { id: string; email: string; name: string | null; avatarUrl: string | null };
            accessToken: string;
            refreshToken: string;
          };

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            image: data.user.avatarUrl,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === 'google' && account.id_token) {
        // Pas d'adapter Prisma sur ce provider : on échange l'ID token Google
        // (vérifié côté backend) contre une vraie session applicative (accessToken +
        // user en base), et on repère une 1re connexion pour déclencher l'écran de
        // consentement CGU/confidentialité dédié (voir /bienvenue-google).
        try {
          const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL']}/auth/oauth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const data = (await res.json()) as {
              user: { id: string; email: string; name: string | null; avatarUrl: string | null };
              accessToken: string;
              refreshToken: string;
              isNewUser: boolean;
            };

            token.sub = data.user.id;
            token['accessToken'] = data.accessToken;
            token['refreshToken'] = data.refreshToken;
            token['isNewUser'] = data.isNewUser;
          }
        } catch {
          // Backend injoignable : la session Google reste établie côté NextAuth
          // mais sans accessToken applicatif (comme un authorize() en échec pour Credentials).
        }
      } else if (user) {
        token['accessToken'] = (user as { accessToken?: string }).accessToken;
        token['refreshToken'] = (user as { refreshToken?: string }).refreshToken;
      }

      if (trigger === 'update' && (session as { termsAccepted?: boolean } | undefined)?.termsAccepted) {
        token['isNewUser'] = false;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? '';
      (session as { accessToken?: string }).accessToken = token['accessToken'] as string | undefined;
      (session as { isNewUser?: boolean }).isNewUser = token['isNewUser'] as boolean | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env['NEXTAUTH_SECRET'],
  // Auth.js v5 rejette les requetes avec UntrustedHost tant que trustHost
  // n'est pas explicite (implicite seulement en dev ou sur Vercel). Sans ca,
  // `next start` (build de prod) hors Vercel casse l'authentification.
  trustHost: true,
});
