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
    if (!getToken()) {
      setUser(null);
      return;
    }
    const { res, data } = await fetchMe();
    if (!res.ok) {
      setUser(null);
      return;
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
