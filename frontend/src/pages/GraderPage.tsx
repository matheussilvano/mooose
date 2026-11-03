import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Copy, Eye, EyeOff, FileUp, Printer, RotateCcw } from "lucide-react";
import SiteNav from "../components/site/SiteNav";
import SiteFooter from "../components/site/SiteFooter";
import {
  ByokSettings, FreeModel, ProviderInfo, STEP_LABELS, fetchFreeModels, fetchOcrEngines, fetchProviders,
  gradeStream, loadSettings, saveSettings, transcribeFile
} from "../lib/byok";
import { countWords, estimateLines, friendlyError, lineStatus, resultToMarkdown } from "../lib/essay";

const md = (s: string) => ({ __html: DOMPurify.sanitize(marked.parse(s || "") as string) });
const DRAFT_KEY = "mooose_draft_v2";

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") as { tema?: string; texto?: string };
  } catch {
    return {};
  }
}

const SAMPLES: Array<{ n: 1 | 3 | 5; label: string; hint: string }> = [
  { n: 1, label: "Rápida", hint: "1 avaliação por competência. Mais barata, nota pode variar." },
  { n: 3, label: "Equilibrada", hint: "3 avaliações por competência e a mediana vale. Boa para modelos gratuitos." },
  { n: 5, label: "Estável", hint: "5 avaliações por competência. Mais lenta e usa mais tokens." }
];

export default function GraderPage() {
  const [settings, setSettings] = useState<ByokSettings>(loadSettings);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [freeModels, setFreeModels] = useState<FreeModel[]>([]);
  const [tema, setTema] = useState(() => loadDraft().tema || "");
  const [texto, setTexto] = useState(() => loadDraft().texto || "");
  const [showKey, setShowKey] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [ocr, setOcr] = useState({ paddle: false, vision: true });
  const [ocrEngine, setOcrEngine] = useState<"paddle" | "vision">("vision");
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<ByokSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ tema, texto }));
    } catch {
      /* private mode */
    }
  }, [tema, texto]);

  useEffect(() => {
    fetchProviders(settings.apiBase).then(setProviders).catch(() => setProviders([]));
    fetchOcrEngines(settings.apiBase).then((e) => {
      setOcr(e);
      if (e.paddle) setOcrEngine("paddle");
    });
  }, [settings.apiBase]);

  useEffect(() => {
    if (settings.provider !== "openrouter") return setFreeModels([]);
    fetchFreeModels(settings.apiBase).then(setFreeModels).catch(() => setFreeModels([]));
  }, [settings.provider, settings.apiBase]);

  const current = useMemo(() => providers.find((p) => p.id === settings.provider), [providers, settings.provider]);
  const needsKey = current ? current.needs_key && !current.server_key_configured : true;
  const keyReady = !needsKey || settings.apiKey.trim().length > 0;
  const words = countWords(texto);
  const lines = estimateLines(texto);
  const status = lineStatus(texto);
  const canSubmit = tema.trim().length > 3 && words >= 30 && keyReady && !loading;
  const sorted = useMemo(() => [...providers].sort((a, b) => Number(b.free_tier) - Number(a.free_tier)), [providers]);

  async function readFile(file?: File) {
    if (!file) return;
    setReading(true);
    setError("");
    try {
      setTexto(await transcribeFile(settings, file, ocrEngine));
    } catch (e: any) {
      setError(friendlyError(e?.message || "Não foi possível ler o arquivo."));
    } finally {
      setReading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError("");
    setResult(null);
    setSteps([]);
    try {
      const res = await gradeStream(settings, { texto, tema }, (n) => setSteps((s) => [...s, n]));
      setResult(res);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e: any) {
      setError(friendlyError(e?.message || "Erro inesperado."));
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(resultToMarkdown(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const lastStep = steps[steps.length - 1];

  return (
    <div className="mz">
      <Helmet>
        <title>Corrigir redação · Mooose</title>
        <meta name="description" content="Corrija sua redação do ENEM com a sua própria chave de IA. Gratuito e de código aberto." />
      </Helmet>
      <SiteNav />
      <main className="mz-wrap mz-app">
        <div className="mz-app__title">
          <div>
            <h1>Corrigir redação</h1>
            <p>Escolha sua IA, escreva ou fotografe o texto e receba nota por competência. Nada é salvo no servidor.</p>
          </div>
          <span className={`mz-status ${keyReady ? "mz-status--ok" : "mz-status--warn"}`} role="status">
            {keyReady ? `IA pronta: ${current?.label.split(" (")[0] || settings.provider}` : "Falta a chave de IA"}
          </span>
        </div>

        <div className="mz-app__grid">
          <div>
            <section className="mz-panel" aria-labelledby="h-redacao">
              <div className="mz-panel__h">
                <h2 id="h-redacao">Sua redação</h2>
                {(texto || tema) && (
                  <button className="mz-btn mz-btn--sm mz-btn--ghost" onClick={() => { setTexto(""); setTema(""); setResult(null); }}>
                    <RotateCcw aria-hidden /> Limpar
                  </button>
                )}
              </div>
              <div className="mz-panel__b">
                <div className="mz-field">
                  <label htmlFor="tema">Tema da proposta</label>
                  <input id="tema" className="mz-input" placeholder="Ex.: Desafios para a valorização de comunidades tradicionais no Brasil" value={tema} onChange={(e) => setTema(e.target.value)} />
                </div>

                <div
                  className={`mz-drop${dragOver ? " is-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files?.[0]); }}
                >
                  <FileUp aria-hidden />
                  <p>
                    <b>{reading ? "Lendo a imagem…" : "Tem a redação em foto ou PDF?"}</b>
                    Arraste o arquivo aqui ou escolha. O texto aparece abaixo para você revisar.
                  </p>
                  <label className="mz-btn mz-btn--sm" style={{ cursor: "pointer" }}>
                    Escolher arquivo
                    <input type="file" accept="image/png,image/jpeg,application/pdf" className="mz-sr" onChange={(e) => readFile(e.target.files?.[0])} />
                  </label>
                </div>
                {ocr.paddle && (
                  <div className="mz-field" style={{ marginTop: -6 }}>
                    <label htmlFor="ocr">Leitor de imagem</label>
                    <select id="ocr" className="mz-select" value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value as any)}>
                      <option value="paddle">Local (PaddleOCR): sem chave, melhor para texto digitado</option>
                      <option value="vision">Modelo de visão da sua IA: melhor para letra de mão</option>
                    </select>
                  </div>
                )}

                <div className="mz-field">
                  <label htmlFor="texto">Texto</label>
                  <div className="mz-paper">
                    <textarea id="texto" placeholder="Cole ou escreva sua redação aqui…" value={texto} onChange={(e) => setTexto(e.target.value)} spellCheck />
                  </div>
                  <div className="mz-count" aria-live="polite">
                    <span>
                      <b>{words}</b> palavras, cerca de <b>{lines}</b> linhas
                    </span>
                    {status === "short" && <span className="is-warn">Menos de 8 linhas: no ENEM o texto seria zerado.</span>}
                    {status === "long" && <span className="is-warn">Mais de 30 linhas: não cabe na folha do ENEM.</span>}
                    {status === "ok" && <span>Dentro do tamanho da folha (8 a 30 linhas).</span>}
                  </div>
                </div>

                {error && (
                  <div className="mz-alert" role="alert">
                    <b>Não foi possível concluir</b>
                    {error}
                  </div>
                )}

                {loading && (
                  <ol className="mz-progress" aria-live="polite" aria-label="Progresso da correção">
                    {steps.map((s, i) => (
                      <li key={i} className={i === steps.length - 1 ? "" : ""}>{STEP_LABELS[s] || s}</li>
                    ))}
                    <li className="is-active">{lastStep === "synthesize" ? "Finalizando" : "Trabalhando…"}</li>
                  </ol>
                )}

                <div className="mz-cta">
                  <button className="mz-btn mz-btn--primary" disabled={!canSubmit} onClick={submit}>
                    {loading ? "Corrigindo…" : "Corrigir redação"}
                  </button>
                  {!canSubmit && !loading && (
                    <span className="mz-help">
                      {!keyReady ? "Cole sua chave de IA ao lado." : !tema.trim() ? "Informe o tema." : "Escreva pelo menos 30 palavras."}
                    </span>
                  )}
                  {loading && <span className="mz-help">Modelos gratuitos podem levar até 2 minutos.</span>}
                </div>
              </div>
            </section>

            {result && (
              <div className="mz-result" ref={resultRef} tabIndex={-1}>
                {result.anulada && (
                  <div className="mz-alert">
                    <b>Redação zerada pelas regras do ENEM</b>
                    {result.anulada}
                  </div>
                )}
                <section className="mz-panel" aria-label="Resultado">
                  <div className="mz-score">
                    <div className="mz-score__n">
                      <b>{result.nota_final}</b>
                      <span>de 1000</span>
                    </div>
                    <div className="mz-bars">
                      {result.competencias.map((c: any) => (
                        <a key={c.id} className="mz-bar" href={`#comp-${c.id}`} onClick={() => (document.getElementById(`comp-${c.id}`) as HTMLDetailsElement | null)?.setAttribute("open", "")}>
                          <b>C{c.id}</b>
                          <span className="mz-bar__track" aria-hidden>
                            {[1, 2, 3, 4, 5].map((i) => <i key={i} className={c.nota >= i * 40 ? "on" : ""} />)}
                          </span>
                          <em>{c.nota}/200</em>
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="mz-md" style={{ borderTop: "2px solid var(--mz-ink)", paddingTop: 16 }} dangerouslySetInnerHTML={md(result.analise_geral)} />
                </section>

                <section className="mz-panel" aria-label="Detalhes por competência">
                  {result.competencias.map((c: any) => (
                    <details key={c.id} id={`comp-${c.id}`} className="mz-comp" open={c.id === 1}>
                      <summary>
                        Competência {c.id}
                        <span>{c.nota} / 200</span>
                      </summary>
                      <div className="mz-md" dangerouslySetInnerHTML={md(c.feedback)} />
                    </details>
                  ))}
                </section>

                {result.proximos_passos?.length > 0 && (
                  <section className="mz-panel">
                    <div className="mz-panel__h"><h2>Para a próxima redação</h2></div>
                    <ol className="mz-md" style={{ paddingTop: 14 }}>
                      {result.proximos_passos.map((p: string, i: number) => <li key={i}>{p}</li>)}
                    </ol>
                  </section>
                )}

                {result.meta?.warnings?.length > 0 && <div className="mz-alert mz-alert--note">{result.meta.warnings.join(" ")}</div>}

                <div className="mz-actions">
                  <button className="mz-btn" onClick={copy}><Copy aria-hidden /> {copied ? "Copiado" : "Copiar correção"}</button>
                  <button className="mz-btn" onClick={() => window.print()}><Printer aria-hidden /> Salvar em PDF</button>
                </div>
                <p className="mz-meta">
                  Modelo {result.meta?.model} em {Math.round((result.meta?.latency_ms || 0) / 1000)} s. Estimativa automática de treino, sem vínculo com o INEP. Modelos menores erram mais.
                </p>
              </div>
            )}
          </div>

          <aside className="mz-side" aria-label="Configuração da IA">
            <section className="mz-panel">
              <div className="mz-panel__h"><h2>Sua IA</h2></div>
              <div className="mz-panel__b">
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="mz-label">Provedor</legend>
                  <div className="mz-providers">
                    {(sorted.length ? sorted : [{ id: settings.provider, label: settings.provider, free_tier: false } as ProviderInfo]).map((p) => (
                      <label key={p.id} className="mz-prov">
                        <input type="radio" name="prov" checked={settings.provider === p.id} onChange={() => update({ provider: p.id, model: "" })} />
                        <b>{p.label.split(" (")[0]}</b>
                        {p.free_tier ? <span className="mz-tag mz-tag--free">grátis</span> : <span className="mz-tag mz-tag--paid">pago</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {current?.notes && <p className="mz-help" style={{ marginTop: -6 }}>{current.notes}</p>}

                {current?.needs_key && (
                  <div className="mz-field">
                    <label htmlFor="key">Chave de API</label>
                    <div className="mz-input--row">
                      <input id="key" className="mz-input" type={showKey ? "text" : "password"} autoComplete="off" spellCheck={false}
                        placeholder={current.server_key_configured ? "Opcional: o servidor já tem uma" : "Cole sua chave"}
                        value={settings.apiKey} onChange={(e) => update({ apiKey: e.target.value })} />
                      <button className="mz-btn mz-btn--ghost" aria-label={showKey ? "Ocultar chave" : "Mostrar chave"} onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                      </button>
                    </div>
                    {current.key_url && (
                      <p className="mz-help">
                        <a href={current.key_url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                          Criar uma chave {current.free_tier ? "gratuita" : ""}
                        </a>
                        . Ela fica só neste navegador.
                      </p>
                    )}
                  </div>
                )}

                <div className="mz-field">
                  <label htmlFor="model">Modelo</label>
                  <input id="model" className="mz-input" list="mz-models" placeholder={current?.default_model || "id do modelo"} value={settings.model} onChange={(e) => update({ model: e.target.value })} />
                  <datalist id="mz-models">
                    {freeModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </datalist>
                  <p className="mz-help">
                    {freeModels.length > 0 ? `${freeModels.length} modelos gratuitos disponíveis agora. Deixe vazio para o padrão.` : "Deixe vazio para usar o padrão do provedor."}
                  </p>
                </div>

                <div className="mz-field">
                  <span className="mz-label">Estabilidade da nota</span>
                  <div className="mz-seg" role="group" aria-label="Estabilidade">
                    {SAMPLES.map((s) => (
                      <button key={s.n} aria-pressed={settings.samples === s.n} onClick={() => update({ samples: s.n })}>{s.label}</button>
                    ))}
                  </div>
                  <p className="mz-help">{SAMPLES.find((s) => s.n === settings.samples)?.hint || SAMPLES[0].hint}</p>
                </div>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>Avançado</summary>
                  <div className="mz-field" style={{ marginTop: 10 }}>
                    <label htmlFor="api">Servidor da API</label>
                    <input id="api" className="mz-input" value={settings.apiBase} onChange={(e) => update({ apiBase: e.target.value })} />
                  </div>
                </details>
              </div>
            </section>
            <p className="mz-help">Assinaturas como ChatGPT Plus e Claude Pro não funcionam como chave de API. Use uma opção gratuita acima.</p>
          </aside>
        </div>
      </main>
      <div className="mz-sticky">
        <button className="mz-btn mz-btn--primary" disabled={!canSubmit} onClick={submit}>{loading ? "Corrigindo…" : "Corrigir redação"}</button>
      </div>
      <SiteFooter />
    </div>
  );
}
