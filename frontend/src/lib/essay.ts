// Small, pure helpers for the essay editor (unit-tested).
export const WORDS_PER_LINE = 11; // handwritten ENEM sheet: roughly 10-12 words per line

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function estimateLines(text: string): number {
  return Math.ceil(countWords(text) / WORDS_PER_LINE);
}

export type LineStatus = "empty" | "short" | "ok" | "long";

// ENEM sheet: minimum of 8 written lines (7 or fewer is zeroed), maximum 30.
export function lineStatus(text: string): LineStatus {
  const lines = estimateLines(text);
  if (lines === 0) return "empty";
  if (lines < 8) return "short";
  if (lines > 30) return "long";
  return "ok";
}

export function friendlyError(message: string): string {
  if (/RateLimit/i.test(message)) return "O limite desse modelo foi atingido. Espere um minuto ou escolha outro modelo gratuito na lista.";
  if (/NotFound/i.test(message)) return "Esse modelo não existe mais no provedor. Apague o campo Modelo para usar o padrão ou escolha outro da lista.";
  if (/StructuredOutput/i.test(message)) return "O modelo escolhido não conseguiu seguir o formato da correção. Tente de novo, escolha outro modelo na lista ou use a estabilidade Equilibrada.";
  if (/Authentication|PermissionDenied|401|403/i.test(message)) return "O provedor recusou sua chave. Confira se ela foi copiada inteira e se está ativa.";
  return message;
}

export function resultToMarkdown(r: any): string {
  const lines = [`# Nota final: ${r.nota_final}/1000`, "", r.analise_geral, ""];
  for (const c of r.competencias || []) lines.push(`## Competência ${c.id}: ${c.nota}/200`, "", c.feedback, "");
  if (r.proximos_passos?.length) lines.push("## Próximos passos", "", ...r.proximos_passos.map((p: string) => `- ${p}`));
  return lines.join("\n");
}
