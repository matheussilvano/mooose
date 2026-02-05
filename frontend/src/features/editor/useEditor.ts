import { useCallback, useEffect, useMemo, useState } from "react";
import { extractCredits, extractFreeRemaining, normalizeScore } from "../../lib/normalize";
import { FREE_REMAINING_KEY } from "../../lib/storage";
import { sendFileCorrection, sendTextCorrection, fetchHistory, submitReview, fetchMe } from "./editorApi";
import { getToken } from "../../lib/auth";
import { PAYWALL_STORAGE_KEY } from "../../lib/storage";

interface Competencia {
  id: number;
  nota: number;
  feedback?: string;
}

export interface CorrectionResult {
  nota_final: number;
  analise_geral?: string;
  feedback?: string;
  feedback_geral?: string;
  competencias?: Competencia[];
}

export interface HistoryItem {
  id: number;
  tema?: string;
  created_at?: string;
  nota_final?: number;
  review?: { stars?: number; comment?: string; created_at?: string; updated_at?: string } | null;
  [key: string]: any;
}

export function useEditor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [stats, setStats] = useState<{ avg: number; best: number }>({ avg: 0, best: 0 });
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [showAuthNudge, setShowAuthNudge] = useState(false);
  const [lastEssayId, setLastEssayId] = useState<number | null>(null);
  const [lastReview, setLastReview] = useState<any | null>(null);

  const updateFreeRemaining = useCallback((value: number | null) => {
    if (value === null || value === undefined) return;
    const safe = Math.max(0, Math.round(Number(value) || 0));
    setFreeRemaining(safe);
    try {
      localStorage.setItem(FREE_REMAINING_KEY, String(safe));
    } catch {
      // ignore
    }
  }, []);

  const loadStoredFreeRemaining = useCallback(() => {
    try {
      const stored = localStorage.getItem(FREE_REMAINING_KEY);
      if (stored === null) return;
      const value = Number(stored);
      if (Number.isFinite(value)) setFreeRemaining(Math.max(0, Math.round(value)));
    } catch {
      // ignore
    }
  }, []);

  const shouldShowPaywallAfterFree = useCallback((prevCredits: number | null, nextCredits: number | null) => {
    if (nextCredits === null || Number(nextCredits) !== 0) return false;
    if (prevCredits !== null && Number(prevCredits) <= 0) return false;
    try {
      if (localStorage.getItem(PAYWALL_STORAGE_KEY) === "1") return false;
    } catch {
      // ignore
    }
    return true;
  }, []);

  const markPaywallShown = useCallback(() => {
    try {
      localStorage.setItem(PAYWALL_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!getToken()) return;
    const { res, data } = await fetchMe();
    if (!res.ok) return;
    const newCredits = extractCredits(data);
    if (newCredits !== null) setCredits(newCredits);
    const freeLeft = extractFreeRemaining(data);
    if (freeLeft !== null) updateFreeRemaining(freeLeft);
  }, [updateFreeRemaining]);

  const refreshHistory = useCallback(async () => {
    if (!getToken()) return;
    const { res, data } = await fetchHistory();
    if (!res.ok) return;
    const items = (data.historico || []) as HistoryItem[];
    setHistory(items);
    const scoreValues = items.map((i) => normalizeScore(i.nota_final)).filter((n): n is number => n !== null);
    const avgScore = normalizeScore(data.stats?.media_nota_final) ?? (scoreValues.length ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length : 0);
    const bestScore = normalizeScore(data.stats?.melhor_nota) ?? (scoreValues.length ? Math.max(...scoreValues) : 0);
    setStats({ avg: avgScore || 0, best: bestScore || 0 });
  }, []);

  useEffect(() => {
    loadStoredFreeRemaining();
    if (getToken()) {
      refreshHistory();
      loadProfile();
    }
  }, [loadProfile, loadStoredFreeRemaining, refreshHistory]);

  const sendText = useCallback(async (tema: string, texto: string) => {
    setLoading(true);
    setError(null);
    setRequiresAuth(false);
    setRequiresPayment(false);
    setShowAuthNudge(false);
    if (getToken() && credits !== null && credits <= 0) {
      setError("Você ficou sem correções ⚠️");
      setRequiresPayment(true);
      setLoading(false);
      return null;
    }
    const { res, data } = await sendTextCorrection(JSON.stringify({ tema, texto }));
    const freeLeft = extractFreeRemaining(data);
    if (freeLeft !== null) updateFreeRemaining(freeLeft);

    const nextAction = String(data?.next_action || "").toUpperCase();
    const needsAuth = Boolean(data?.requires_auth) || nextAction === "PROMPT_SIGNUP";
    const needsPayment = Boolean(data?.requires_payment) || nextAction === "PROMPT_PAYWALL";
    if (needsAuth) {
      setRequiresAuth(true);
      setLoading(false);
      return null;
    }
    if (needsPayment) {
      setRequiresPayment(true);
      setLoading(false);
      return null;
    }
    if (!res.ok) {
      const msg = data?.detail || data?.message || data?.error || "Falha na correção.";
      setError(res.status >= 500 ? "Serviço indisponível. Tente novamente em instantes." : msg);
      setLoading(false);
      return null;
    }
    const prevCredits = credits;
    const newCredits = extractCredits(data);
    if (newCredits !== null) setCredits(newCredits);
    if (shouldShowPaywallAfterFree(prevCredits, newCredits)) {
      markPaywallShown();
      setRequiresPayment(true);
    }
    const essayId = data?.essay_id || data?.id || data?.resultado?.essay_id || data?.resultado?.id || null;
    const review = data?.review || data?.resultado?.review || null;
    setLastEssayId(essayId ? Number(essayId) : null);
    setLastReview(review);
    const resultado = data?.resultado || data;
    setResult(resultado);
    await refreshHistory();
    const effectiveFree = freeLeft !== null ? Math.max(0, Math.round(Number(freeLeft) || 0)) : freeRemaining;
    if (!getToken() && effectiveFree === 0) {
      setShowAuthNudge(true);
    }
    setLoading(false);
    return resultado as CorrectionResult;
  }, [credits, freeRemaining, markPaywallShown, refreshHistory, shouldShowPaywallAfterFree, updateFreeRemaining]);

  const sendFile = useCallback(async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setRequiresAuth(false);
    setRequiresPayment(false);
    setShowAuthNudge(false);
    if (getToken() && credits !== null && credits <= 0) {
      setError("Você ficou sem correções ⚠️");
      setRequiresPayment(true);
      setLoading(false);
      return null;
    }
    const { res, data } = await sendFileCorrection(formData);
    const freeLeft = extractFreeRemaining(data);
    if (freeLeft !== null) updateFreeRemaining(freeLeft);

    const nextAction = String(data?.next_action || "").toUpperCase();
    const needsAuth = Boolean(data?.requires_auth) || nextAction === "PROMPT_SIGNUP";
    const needsPayment = Boolean(data?.requires_payment) || nextAction === "PROMPT_PAYWALL";
    if (needsAuth) {
      setRequiresAuth(true);
      setLoading(false);
      return null;
    }
    if (needsPayment) {
      setRequiresPayment(true);
      setLoading(false);
      return null;
    }
    if (!res.ok) {
      const msg = data?.detail || data?.message || data?.error || "Falha na correção.";
      setError(res.status >= 500 ? "Serviço indisponível. Tente novamente em instantes." : msg);
      setLoading(false);
      return null;
    }
    const prevCredits = credits;
    const newCredits = extractCredits(data);
    if (newCredits !== null) setCredits(newCredits);
    if (shouldShowPaywallAfterFree(prevCredits, newCredits)) {
      markPaywallShown();
      setRequiresPayment(true);
    }
    const essayId = data?.essay_id || data?.id || data?.resultado?.essay_id || data?.resultado?.id || null;
    const review = data?.review || data?.resultado?.review || null;
    setLastEssayId(essayId ? Number(essayId) : null);
    setLastReview(review);
    const resultado = data?.resultado || data;
    setResult(resultado);
    await refreshHistory();
    const effectiveFree = freeLeft !== null ? Math.max(0, Math.round(Number(freeLeft) || 0)) : freeRemaining;
    if (!getToken() && effectiveFree === 0) {
      setShowAuthNudge(true);
    }
    setLoading(false);
    return resultado as CorrectionResult;
  }, [credits, freeRemaining, markPaywallShown, refreshHistory, shouldShowPaywallAfterFree, updateFreeRemaining]);

  const saveReview = useCallback(async (essayId: number, stars: number, comment?: string) => {
    const { res, data } = await submitReview(essayId, stars, comment);
    if (!res.ok) {
      const msg = data?.detail || data?.message || "Falha ao salvar avaliação.";
      throw new Error(msg);
    }
    await refreshHistory();
    return data;
  }, [refreshHistory]);

  return {
    loading,
    error,
    result,
    history,
    credits,
    freeRemaining,
    stats,
    requiresAuth,
    requiresPayment,
    showAuthNudge,
    lastEssayId,
    lastReview,
    sendText,
    sendFile,
    refreshHistory,
    loadProfile,
    saveReview
  };
}
