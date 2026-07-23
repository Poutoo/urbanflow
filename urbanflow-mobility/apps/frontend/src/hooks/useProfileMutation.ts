'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { updateUserProfile } from '@/lib/api';
import type { UpdateProfilePayload } from '@urbanflow/types';

/**
 * Persiste un changement de réglage côté backend. Best-effort : l'appelant a
 * déjà mis à jour son état local de façon optimiste, donc un échec réseau
 * n'empêche pas l'utilisateur de continuer (juste loggé, non bloquant).
 */
export function useProfileMutation() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;

  return useCallback(
    async (partial: UpdateProfilePayload) => {
      if (!token) return;
      try {
        await updateUserProfile(token, partial);
      } catch (err) {
        console.warn('Échec de la sauvegarde du profil :', err);
      }
    },
    [token],
  );
}
