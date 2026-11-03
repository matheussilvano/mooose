// Bring-your-own-key settings. Stored ONLY in this browser (localStorage) and sent
// per request to the grading API as headers. The Mooose server never persists them.
import { API_BASE } from "./api";

export type ProviderInfo = {
  id: string;
  label: string;
  default_model: string;
  needs_key: boolean;
  free_tier: boolean;
  vision: boolean;
  key_url: string;
  notes: string;
  server_key_configured: boolean;
};

export type ByokSettings = {
  apiBase: string;
  provider: string;
  model: string;
  apiKey: string;
  samples: number;
};

const KEY = "mooose_byok_v1";

export const DEFAULT_API_BASE =
  import.meta.env.VITE_OPEN_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : API_BASE);

export const DEFAULT_SETTINGS: ByokSettings = {
  apiBase: DEFAULT_API_BASE,
  provider: "openrouter",
  model: "",
  apiKey: "",
  samples: 1
};

export function loadSettings(): ByokSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: ByokSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: keep in memory only */
  }
}

export function llmHeaders(s: ByokSettings): Record<string, string> {
  const h: Record<string, string> = { "X-LLM-Provider": s.provider };
  if (s.model.trim()) h["X-LLM-Model"] = s.model.trim();
  if (s.apiKey.trim()) h["X-LLM-Api-Key"] = s.apiKey.trim();
  return h;
}

export async function fetchProviders(apiBase: string): Promise<ProviderInfo[]> {
  const res = await fetch(`${apiBase}/v1/providers`);
  if (!res.ok) throw new Error("Não foi possível carregar os provedores.");
  return res.json();
}

export type FreeModel = { id: string; name: string; context_length?: number; vision: boolean };

export async function fetchFreeModels(apiBase: string): Promise<FreeModel[]> {
  const res = await fetch(`${apiBase}/v1/providers/openrouter/free-models`);
  if (!res.ok) throw new Error("Não foi possível listar os modelos gratuitos.");
  return res.json();
}

export const STEP_LABELS: Record<string, string> = {
  analyze_theme: "Analisando o tema",
  grade_c1: "Competência 1 (norma culta)",
  grade_c2: "Competência 2 (tema e repertório)",
  grade_c3: "Competência 3 (argumentação)",
  grade_c4: "Competência 4 (coesão)",
  grade_c5: "Competência 5 (intervenção)",
  audit: "Revisão por segundo corretor",
  finalize: "Calibrando notas",
  synthesize: "Escrevendo o feedback"
};

// POST + Server-Sent Events (EventSource only supports GET).
export async function gradeStream(
  s: ByokSettings,
  body: { texto: string; tema: string },
  onProgress: (node: string) => void
): Promise<any> {
  const res = await fetch(`${s.apiBase}/v1/grade/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...llmHeaders(s) },
    body: JSON.stringify({ ...body, samples: s.samples })
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.detail || "Erro ao iniciar a correção.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (!event || !data) continue;
      const parsed = JSON.parse(data);
      if (event === "progress") onProgress(parsed);
      else if (event === "error") throw new Error(parsed);
      else if (event === "result") return parsed;
    }
  }
  throw new Error("A correção terminou sem resultado.");
}
