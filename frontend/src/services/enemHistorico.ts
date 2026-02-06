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

export async function getHistorico() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const res = await fetch(`${API_BASE}/app/enem/historico`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.detail || data?.message || "Erro ao carregar histórico.";
    throw new Error(msg);
  }
  const data = await res.json().catch(() => ({}));
  const items = Array.isArray(data?.historico) ? data.historico : Array.isArray(data) ? data : [];
  cache = { data: items, ts: Date.now() };
  return items as EnemHistoricoItem[];
}

export function clearHistoricoCache() {
  cache = null;
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
