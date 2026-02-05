import { ANON_ID_KEY } from "./storage";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export function getAuthHeaders(extra: Record<string, string> = {}, options: { skipContentType?: boolean } = {}) {
  const t = getToken();
  const anonId = localStorage.getItem(ANON_ID_KEY) || "";
  const headers: Record<string, string> = {
    ...(options.skipContentType ? {} : { "Content-Type": "application/json" }),
    "X-ANON-ID": anonId,
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
  return { ...headers, ...extra };
}
