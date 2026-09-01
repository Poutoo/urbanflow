'use client'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import type { UserProfile, UpdateProfilePayload } from '@urbanflow/types'

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
  return (await res.json()) as T
}

/**
 * Profil utilisateur persisté (GET/PUT /users/profile), authentifié via le
 * Bearer token de la session NextAuth. `updateProfile` applique une mise à
 * jour optimiste (le nouvel état s'affiche immédiatement) et revient en
 * arrière automatiquement (`rollbackOnError`) si la requête PUT échoue —
 * sans quoi un toggle qui échoue en silence laisserait l'UI mentir sur
 * l'état réellement persisté côté serveur.
 */
export function useProfile() {
  const { data: session, status } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken

  const { data, error, isLoading, mutate } = useSWR<UserProfile>(
    token ? (['/users/profile', token] as const) : null,
    ([path, tk]: readonly [string, string]) => authFetch<UserProfile>(path, tk),
  )

  async function updateProfile(patch: UpdateProfilePayload): Promise<void> {
    if (!token) return
    const optimisticData = data ? { ...data, ...patch } : undefined

    await mutate(() => authFetch<UserProfile>('/users/profile', token, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }), {
      optimisticData,
      rollbackOnError: true,
      revalidate: false,
    })
  }

  return { profile: data, error, isLoading, sessionStatus: status, updateProfile }
}
