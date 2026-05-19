import { useCallback, useEffect, useState } from "react";
import { setToken, getToken } from "../../lib/auth";
import { deleteMe, fetchMe, updateMe } from "./editorApi";

export interface UserInfo {
  id?: number;
  full_name?: string;
  email?: string;
  bio?: string | null;
  profile_avatar?: "green" | "blue" | "gray" | "black" | "pink" | null;
  credits?: number;
  subscription?: SubscriptionInfo | null;
}

export interface SubscriptionInfo {
  plan_code?: string;
  status?: string;
  active?: boolean;
  current_period_end?: string | null;
  monthly_correction_limit?: number | null;
  monthly_corrections_used?: number;
  daily_corrections_used?: number;
  usage_limit?: number | null;
  usage_used?: number;
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

  const updateProfile = useCallback(async (payload: { full_name?: string | null; bio?: string | null; profile_avatar?: string | null }) => {
    const { res, data } = await updateMe(payload);
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || "Não foi possível atualizar o perfil.");
    }
    setUser(data?.user || data || null);
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    const { res, data } = await deleteMe();
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || "Não foi possível excluir a conta.");
    }
    logout();
    return data;
  }, [logout]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  return { user, loadMe, logout, updateProfile, deleteAccount };
}
