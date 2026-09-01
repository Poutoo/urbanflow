'use client'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import type { CreateFavoriteAddressPayload, FavoriteAddress } from '@urbanflow/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'

async function authFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Erreur API ${res.status}`)
  // DELETE renvoie 204 sans corps
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * CRUD des adresses favorites (GET/POST/PATCH/DELETE /favorite-addresses),
 * authentifié via le Bearer token de la session NextAuth. Chaque mutation
 * revalide la liste depuis le serveur après coup plutôt que de deviner le
 * nouvel état localement — la liste est courte, le coût d'un aller-retour
 * réseau supplémentaire est négligeable face au risque de désync.
 */
export function useFavoriteAddresses() {
  const { data: session } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken

  const { data, error, isLoading, mutate } = useSWR<FavoriteAddress[]>(
    token ? (['/favorite-addresses', token] as const) : null,
    ([path, tk]: readonly [string, string]) => authFetch<FavoriteAddress[]>(path, tk),
  )

  async function addAddress(payload: CreateFavoriteAddressPayload): Promise<void> {
    if (!token) return
    await authFetch('/favorite-addresses', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function removeAddress(id: string): Promise<void> {
    if (!token) return
    // Optimiste : l'adresse disparaît immédiatement de la liste affichée ;
    // revalidate re-synchronise avec le serveur juste après (ou restaure
    // l'entrée si le DELETE a en fait échoué côté serveur).
    await mutate(
      async () => {
        await authFetch(`/favorite-addresses/${id}`, token, { method: 'DELETE' })
        return (data ?? []).filter((a) => a.id !== id)
      },
      { optimisticData: (data ?? []).filter((a) => a.id !== id) },
    )
  }

  return { addresses: data ?? [], error, isLoading, addAddress, removeAddress }
}
