import { API_BASE } from "../../lib/api";
import { getAuthHeaders } from "../../lib/auth";

export async function sendTextCorrection(payload: string) {
  const res = await fetch(`${API_BASE}/corrections`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: payload
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function sendFileCorrection(formData: FormData) {
  const res = await fetch(`${API_BASE}/corrections/file`, {
    method: "POST",
    headers: getAuthHeaders({}, { skipContentType: true }),
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/app/enem/historico`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function submitReview(essayId: number, stars: number, comment?: string) {
  const res = await fetch(`${API_BASE}/app/enem/avaliar`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ essay_id: essayId, stars, comment: comment || undefined })
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function linkAnonSession(anonId: string) {
  const res = await fetch(`${API_BASE}/auth/link-anon`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ anon_id: anonId })
  });
  return res;
}
