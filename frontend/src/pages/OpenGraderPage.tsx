import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { marked } from "marked";
import PageShell from "../components/PageShell";
import Section from "../components/ui/Section";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import {
  ByokSettings, FreeModel, ProviderInfo, STEP_LABELS, fetchFreeModels, fetchOcrEngines, fetchProviders, gradeStream, transcribeFile,
  loadSettings, saveSettings
} from "../lib/byok";

const MD = "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1";
const md = (s: string) => ({ __html: DOMPurify.sanitize(marked.parse(s || "") as string) });

export default function OpenGraderPage() {
  const [settings, setSettings] = useState<ByokSettings>(loadSettings);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [freeModels, setFreeModels] = useState<FreeModel[]>([]);
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [ocrEngines, setOcrEngines] = useState({ paddle: false, vision: true });
  const [ocrEngine, setOcrEngine] = useState<"paddle" | "vision">("vision");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");

  const update = (patch: Partial<ByokSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  useEffect(() => {
    fetchProviders(settings.apiBase).then(setProviders).catch(() => setProviders([]));
  }, [settings.apiBase]);

  useEffect(() => {
    if (settings.provider !== "openrouter") return setFreeModels([]);
    fetchFreeModels(settings.apiBase).then(setFreeModels).catch(() => setFreeModels([]));
  }, [settings.provider, settings.apiBase]);

  useEffect(() => {
    fetchOcrEngines(settings.apiBase).then((e) => {
      setOcrEngines(e);
      if (e.paddle) setOcrEngine("paddle");
    });
  }, [settings.apiBase]);

  async function onFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setReading(true);
    setError("");
    try {
      setTexto(await transcribeFile(settings, file, ocrEngine));
    } catch (e: any) {
      setError(e?.message || "Erro ao ler o arquivo.");
    } finally {
      setReading(false);
    }
  }

  const current = useMemo(() => providers.find((p) => p.id === settings.provider), [providers, settings.provider]);
  const needsKey = current ? current.needs_key && !current.server_key_configured : true;
  const canSubmit = tema.trim().length > 3 && texto.trim().length > 50 && (!needsKey || settings.apiKey.trim());

  async function submit() {
    setLoading(true);
    setError("");
    setResult(null);
    setSteps([]);
    try {
      const res = await gradeStream(settings, { tema, texto }, (n) => setSteps((s) => [...s, n]));
      setResult(res);
    } catch (e: any) {
      setError(e?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <Helmet>
        <title>Corretor de redação ENEM open-source · Mooose</title>
        <meta name="description" content="Corrija sua redação do ENEM com a sua própria chave de IA (OpenRouter grátis, Gemini, Groq, Ollama, OpenAI, Claude). Open-source." />
      </Helmet>
      <Section
        title="Corretor de redação ENEM open-source"
        subtitle="Use sua própria chave de IA — a gente não guarda nada. Dá para corrigir de graça com OpenRouter, Gemini, Groq ou Ollama (local)."
      >
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card className="h-fit space-y-4 p-6">
            <h3 className="text-base font-semibold">1. Sua IA</h3>
            <label className="block text-xs font-semibold">
              Provedor
              <select
                className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-3 text-sm"
                value={settings.provider}
                onChange={(e) => update({ provider: e.target.value, model: "" })}
              >
                {(providers.length ? providers : [{ id: settings.provider, label: settings.provider } as ProviderInfo]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {current?.notes && <p className="text-xs text-text-muted">{current.notes}</p>}
            {current?.needs_key && (
              <label className="block text-xs font-semibold">
                Chave de API
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={current.server_key_configured ? "Opcional: o servidor já tem uma chave" : "cole sua chave aqui"}
                  value={settings.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                />
                {current.key_url && (
                  <a className="mt-1 block text-brand underline" href={current.key_url} target="_blank" rel="noreferrer">
                    Criar chave {current.free_tier ? "(grátis)" : ""}
                  </a>
                )}
              </label>
            )}
            <label className="block text-xs font-semibold">
              Modelo
              <Input
                list="free-models"
                placeholder={current?.default_model || "id do modelo"}
                value={settings.model}
                onChange={(e) => update({ model: e.target.value })}
              />
              <datalist id="free-models">
                {freeModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </datalist>
              {freeModels.length > 0 && <span className="mt-1 block font-normal text-text-muted">{freeModels.length} modelos gratuitos encontrados agora no OpenRouter.</span>}
            </label>
            <label className="block text-xs font-semibold">
              Estabilidade da nota: {settings.samples}x
              <input type="range" min={1} max={5} value={settings.samples} className="w-full" onChange={(e) => update({ samples: Number(e.target.value) })} />
              <span className="font-normal text-text-muted">Mais amostras = nota mais estável, porém mais tokens.</span>
            </label>
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold">Avançado: servidor da API</summary>
              <Input className="mt-2" value={settings.apiBase} onChange={(e) => update({ apiBase: e.target.value })} />
            </details>
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-text-muted">
              🔒 Sua chave fica só no seu navegador e é enviada apenas para a API de correção, nunca salva. Assinaturas (ChatGPT Plus, Claude Pro) não
              funcionam como chave de API — veja as opções gratuitas acima.
            </p>
          </Card>

          <div className="space-y-6">
            <Card className="space-y-4 p-6">
              <h3 className="text-base font-semibold">2. Sua redação</h3>
              <Input placeholder="Tema da redação (ex.: Desafios para ...)" value={tema} onChange={(e) => setTema(e.target.value)} />
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3 text-xs">
                <label className="cursor-pointer rounded-lg bg-brand/10 px-3 py-2 font-semibold text-brand">
                  📷 Enviar foto ou PDF
                  <input type="file" accept="image/png,image/jpeg,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <select className="h-9 rounded-lg border border-border bg-white px-2" value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value as any)} aria-label="Leitor de imagem">
                  {ocrEngines.paddle && <option value="paddle">Leitor local (PaddleOCR, sem chave)</option>}
                  <option value="vision">Modelo de visão da sua IA</option>
                </select>
                <span className="text-text-muted">{reading ? "Lendo a imagem..." : fileName ? `${fileName} — revise o texto abaixo antes de corrigir.` : "O texto lido aparece abaixo para você revisar."}</span>
              </div>
              <Textarea className="min-h-[280px]" placeholder="Cole aqui o texto da sua redação..." value={texto} onChange={(e) => setTexto(e.target.value)} />
              <Button full loading={loading} disabled={!canSubmit} onClick={submit}>
                Corrigir redação
              </Button>
              {loading && (
                <ul className="space-y-1 text-xs text-text-muted" aria-live="polite">
                  {steps.map((s, i) => (
                    <li key={i}>✓ {STEP_LABELS[s] || s}</li>
                  ))}
                </ul>
              )}
              {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            </Card>

            {result && (
              <Card className="p-6">
                <div className="text-center">
                  <span className="text-xs text-text-muted">NOTA FINAL</span>
                  <div className="mt-2 inline-flex rounded-full bg-brand/10 px-4 py-2 text-3xl font-bold text-brand">{result.nota_final}</div>
                  {result.anulada && <p className="mt-2 text-sm text-rose-700">{result.anulada}</p>}
                </div>
                <div className={`mt-4 text-sm ${MD}`} dangerouslySetInnerHTML={md(result.analise_geral)} />
                <div className="mt-4 space-y-3">
                  {result.competencias.map((c: any) => (
                    <div key={c.id} className="rounded-xl border border-border bg-slate-50 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>Competência {c.id}</span>
                        <span className="rounded-full bg-brand/10 px-2 py-1 text-brand">{c.nota} / 200</span>
                      </div>
                      <div className={`mt-2 text-xs ${MD}`} dangerouslySetInnerHTML={md(c.feedback)} />
                    </div>
                  ))}
                </div>
                {result.proximos_passos?.length > 0 && (
                  <>
                    <h4 className="mt-4 text-sm font-semibold">Próximos passos</h4>
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {result.proximos_passos.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </>
                )}
                {result.meta?.warnings?.length > 0 && <p className="mt-3 text-xs text-amber-700">⚠ {result.meta.warnings.join(" ")}</p>}
                <p className="mt-4 text-xs text-text-muted">
                  Modelo: {result.meta?.model} · {Math.round((result.meta?.latency_ms || 0) / 1000)}s. Estimativa automática, não oficial — não é afiliado ao INEP.
                </p>
              </Card>
            )}
          </div>
        </div>
      </Section>
    </PageShell>
  );
}
