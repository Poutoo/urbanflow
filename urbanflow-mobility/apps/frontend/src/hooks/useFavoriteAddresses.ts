'use client';

import { useSession } from 'next-auth/react';
import { useApiSwr } from './useApiSwr';
import { createFavoriteAddress, deleteFavoriteAddress } from '@/lib/api';
import type { CreateFavoriteAddressPayload, FavoriteAddress } from '@urbanflow/types';

export function useFavoriteAddresses() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const { data, mutate, isLoading } = useApiSwr<FavoriteAddress[]>('/favorite-addresses');

  async function create(payload: CreateFavoriteAddressPayload) {
    if (!token) return;
    await createFavoriteAddress(token, payload);
    await mutate();
  }

  async function remove(id: string) {
    if (!token) return;
    // Optimiste : l'adresse disparaît immédiatement, sans attendre la réponse réseau.
    await mutate(async (current) => {
      await deleteFavoriteAddress(token, id);
      return current?.filter((a) => a.id !== id);
    }, {
      optimisticData: data?.filter((a) => a.id !== id),
      rollbackOnError: true,
    });
  }

  return { addresses: data ?? [], isLoading, create, remove };
}
