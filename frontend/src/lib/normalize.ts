export function normalizeCredits(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

export function normalizeScore(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function extractCredits(data: any) {
  if (!data) return null;
  const sources = [data, data.user, data.account, data.profile];
  const keys = [
    "credits",
    "creditos",
    "creditos_disponiveis",
    "credits_available",
    "correcoes_disponiveis",
    "corrections_left",
    "saldo_creditos",
    "credit_balance"
  ];
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const value = normalizeCredits(src[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

export function extractFreeRemaining(data: any) {
  if (!data) return null;
  const sources = [data, data.user, data.account, data.profile];
  const keys = ["free_remaining", "freeRemaining", "free_left", "free_corrections_left"];
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const raw = src[key];
      if (raw === null || raw === undefined) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

export function extractHistoryEssayText(item: any) {
  return item?.texto || item?.texto_ocr || item?.texto_original || item?.redacao || item?.conteudo || item?.transcricao || "";
}

export function extractHistoryResult(item: any) {
  if (item?.resultado) return item.resultado;
  const hasCompetencias = Array.isArray(item?.competencias);
  const hasAnalise = Boolean(item?.analise_geral || item?.feedback_geral || item?.feedback);
  if (hasCompetencias || hasAnalise) return item;
  return null;
}
