import { ANON_ID_KEY } from "./storage";

function generateAnonId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setAnonCookie(id: string) {
  try {
    document.cookie = `mooose_anon_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function getAnonCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )mooose_anon_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function ensureAnonSession() {
  let anonId: string | null = null;
  try {
    anonId = localStorage.getItem(ANON_ID_KEY);
  } catch {
    anonId = null;
  }
  if (!anonId) {
    const cookieId = getAnonCookie();
    if (cookieId) anonId = cookieId;
  }
  if (!anonId) {
    anonId = generateAnonId();
    try {
      localStorage.setItem(ANON_ID_KEY, anonId);
    } catch {
      // ignore
    }
  }
  setAnonCookie(anonId);
  return anonId;
}
