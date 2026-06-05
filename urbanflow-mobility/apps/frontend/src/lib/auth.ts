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
    async jwt({ token, user }) {
      if (user) {
        token['accessToken'] = (user as { accessToken?: string }).accessToken;
        token['refreshToken'] = (user as { refreshToken?: string }).refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? '';
      (session as { accessToken?: string }).accessToken = token['accessToken'] as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env['NEXTAUTH_SECRET'],
});
