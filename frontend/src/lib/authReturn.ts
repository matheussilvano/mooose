import { AUTH_RETURN_KEY } from "./storage";

export function setAuthReturnPath(path: string) {
  if (!path) return;
  try {
    localStorage.setItem(AUTH_RETURN_KEY, path);
  } catch {
    // ignore
  }
}

export function peekAuthReturnPath() {
  try {
    return localStorage.getItem(AUTH_RETURN_KEY) || "";
  } catch {
    return "";
  }
}

export function consumeAuthReturnPath() {
  try {
    const value = localStorage.getItem(AUTH_RETURN_KEY) || "";
    localStorage.removeItem(AUTH_RETURN_KEY);
    return value;
  } catch {
    return "";
  }
}

export function parseAuthParams(search: string, hash: string) {
  const params = new URLSearchParams(search);
  const safeHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(safeHash);
  const token =
    params.get("token") ||
    params.get("access_token") ||
    hashParams.get("token") ||
    hashParams.get("access_token") ||
    "";
  const next = params.get("next") || hashParams.get("next") || "";
  return { token, next };
}
