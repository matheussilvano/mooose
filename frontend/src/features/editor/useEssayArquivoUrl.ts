import { useCallback, useEffect, useMemo, useState } from "react";
import { EssayArquivoUrl, getEssayArquivoUrl } from "../../services/enemHistorico";

interface UseEssayArquivoUrlOptions {
  enabled?: boolean;
}

export function useEssayArquivoUrl(essayId?: number | null, options: UseEssayArquivoUrlOptions = {}) {
  const { enabled = true } = options;
  const [fileData, setFileData] = useState<EssayArquivoUrl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validEssayId = useMemo(() => {
    const value = Number(essayId);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.trunc(value);
  }, [essayId]);

  const load = useCallback(async (force = false, silent = false) => {
    if (!enabled || !validEssayId) {
      setFileData(null);
      setError(null);
      setLoading(false);
      return null;
    }

    if (!silent) setLoading(true);
    try {
      const data = await getEssayArquivoUrl(validEssayId, { force });
      setFileData(data);
      setError(null);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar arquivo.";
      setError(message);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enabled, validEssayId]);

  useEffect(() => {
    if (!enabled || !validEssayId) {
      setFileData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load, validEssayId]);

  useEffect(() => {
    if (!enabled || !validEssayId || !fileData?.expires_at) return;
    const refreshInMs = Math.max(1000, fileData.expires_at * 1000 - Date.now() - 5000);
    const timer = window.setTimeout(() => {
      void load(true, true);
    }, refreshInMs);
    return () => window.clearTimeout(timer);
  }, [enabled, fileData?.expires_at, load, validEssayId]);

  return {
    url: fileData?.url || null,
    expiresAt: fileData?.expires_at || null,
    loading,
    error,
    refresh: () => load(true)
  };
}
