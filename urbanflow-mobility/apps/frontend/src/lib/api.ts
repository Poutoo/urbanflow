import axios from 'axios';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export async function registerUser(data: { email: string; password: string; name?: string }) {
  const res = await api.post<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  }>('/auth/register', data);
  return res.data;
}
