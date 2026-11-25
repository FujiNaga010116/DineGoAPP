// ==============================================================================
// DineGo Frontend — Core HTTP Client & Auth Headers
// ==============================================================================

export const API_BASE_URL = 'http://localhost:3000/api/v1';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    const token = localStorage.getItem('dinego_access_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export async function safeRequest<T = any>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}
