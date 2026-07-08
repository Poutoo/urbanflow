'use client'
import useSWR, { type SWRConfiguration } from 'swr'
import { useSession } from 'next-auth/react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api'

/**
 * useSWR authentifié : ajoute le Bearer token de la session NextAuth.
 * La requête est suspendue (key null) tant que le token n'est pas disponible.
 */
export function useApiSwr<T>(path: string | null, config?: SWRConfiguration<T>) {
  const { data: session, status } = useSession()
  const token = (session as { accessToken?: string } | null)?.accessToken

  const swr = useSWR<T>(
    path && token ? [path, token] : null,
    async ([p, tk]: [string, string]) => {
      const res = await fetch(`${API_URL}${p}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) throw new Error(`Erreur API ${res.status}`)
      return (await res.json()) as T
    },
    config,
  )

  return { ...swr, sessionStatus: status }
}
