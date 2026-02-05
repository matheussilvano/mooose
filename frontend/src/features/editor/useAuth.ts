import { useCallback, useEffect, useState } from "react";
import { setToken, getToken } from "../../lib/auth";
import { fetchMe } from "./editorApi";

interface UserInfo {
  full_name?: string;
  email?: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);

  const loadMe = useCallback(async () => {
    const hasToken = Boolean(getToken());
    const { res, data } = await fetchMe({ allowCookie: !hasToken });
    if (!res.ok) {
      setUser(null);
      return;
    }
    if (!hasToken) {
      const newToken = data?.access_token || data?.token || data?.accessToken;
      if (newToken) setToken(newToken);
    }
    setUser(data?.user || data || null);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  return { user, loadMe, logout };
}
