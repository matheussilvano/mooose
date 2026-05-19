import { API_BASE } from "../lib/api";
import { getAuthHeaders } from "../lib/auth";

export type EnemReview = {
  stars?: number;
  comment?: string;
  created_at?: string;
  updated_at?: string;
} | null;

export type EnemHistoricoItem = {
  id: number;
  essay_id?: number;
  tema?: string;
  input_type?: string;
  created_at?: string;
  nota_final?: number;
  c1_nota?: number;
  c2_nota?: number;
  c3_nota?: number;
  c4_nota?: number;
  c5_nota?: number;
  arquivo_url?: string;
  resultado?: any;
  review?: EnemReview;
  [key: string]: any;
};

let cache: { data: EnemHistoricoItem[]; ts: number } | null = null;
const CACHE_TTL = 1000 * 20;
const SIGNED_URL_REFRESH_SAFETY_MS = 5000;
const signedUrlCache = new Map<number, EssayArquivoUrl>();

export type EssayArquivoUrl = {
  url: string;
  expires_at: number | null;
};

function extractMessage(data: any, fallback: string) {
  return data?.detail || data?.message || data?.error || fallback;
}

export async function getHistorico() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const res = await fetch(`${API_BASE}/app/enem/historico`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = extractMessage(data, "Erro ao carregar histórico.");
    throw new Error(msg);
  }
  const data = await res.json().catch(() => ({}));
  const items = Array.isArray(data?.historico) ? data.historico : Array.isArray(data) ? data : [];
  cache = { data: items, ts: Date.now() };
  return items as EnemHistoricoItem[];
}

export function clearHistoricoCache() {
  cache = null;
  signedUrlCache.clear();
}

export function sortHistorico(items: EnemHistoricoItem[]) {
  return [...items].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });
}

export function formatDatePt(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
}

export function getScoreLabel(score: number) {
  if (score >= 800) return "Excelente";
  if (score >= 600) return "Bom";
  if (score >= 400) return "Regular";
  return "Precisa melhorar";
}

export function getScoreTone(score: number) {
  if (score >= 800) return "green";
  if (score >= 600) return "lime";
  if (score >= 400) return "orange";
  return "red";
}

export function getEssayId(item: any) {
  const raw = item?.essay_id ?? item?.id ?? item?.resultado?.essay_id ?? item?.resultado?.id;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
}

function isSignedUrlValid(entry: EssayArquivoUrl | undefined) {
  if (!entry || !entry.url) return false;
  if (!entry.expires_at) return false;
  return entry.expires_at * 1000 > Date.now() + SIGNED_URL_REFRESH_SAFETY_MS;
}

function normalizeExpiresAt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

export async function getEssayArquivoUrl(essayId: number, options: { force?: boolean } = {}) {
  const { force = false } = options;
  const key = Math.trunc(Number(essayId));
  if (!Number.isFinite(key) || key <= 0) throw new Error("ID da redação inválido.");

  if (!force) {
    const cached = signedUrlCache.get(key);
    if (isSignedUrlValid(cached)) return cached as EssayArquivoUrl;
  }

  const res = await fetch(`${API_BASE}/app/enem/essays/${key}/arquivo-url`, {
    headers: getAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) throw new Error("Você não tem permissão para visualizar esse arquivo.");
    if (res.status === 404) throw new Error("Arquivo não encontrado para esta redação.");
    throw new Error(extractMessage(data, "Erro ao carregar arquivo da redação."));
  }

  const payload: EssayArquivoUrl = {
    url: String(data?.url || "").trim(),
    expires_at: normalizeExpiresAt(data?.expires_at)
  };
  if (!payload.url) throw new Error("Arquivo indisponível no momento.");
  signedUrlCache.set(key, payload);
  return payload;
}

export function getResultStatus(item: any) {
  const status = item?.resultado?.status ?? item?.status ?? "";
  return String(status || "").toLowerCase();
}

export function isOcrError(item: any) {
  return getResultStatus(item) === "erro_ocr";
}

export function getResultErrorMessage(item: any) {
  const result = item?.resultado || {};
  return (
    result?.error_message ||
    result?.message ||
    result?.detail ||
    item?.error_message ||
    item?.message ||
    item?.detail ||
    "Não foi possível ler a imagem/PDF enviado. Tente reenviar com melhor qualidade."
  );
}

export function getSignedUrlKind(url?: string | null): "pdf" | "image" | "unknown" {
  if (!url) return "unknown";
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  if (clean.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|bmp|svg|heic|heif|avif)$/.test(clean)) return "image";
  return "unknown";
}
