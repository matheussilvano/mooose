export const API_BASE = import.meta.env.VITE_API_BASE || "https://mooose-backend.onrender.com";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.detail || data?.message || "Erro na requisição.";
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
