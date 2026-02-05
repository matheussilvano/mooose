import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Section from "../components/ui/Section";
import { ensureAnonSession } from "../lib/anon";
import { useEditor } from "../features/editor/useEditor";
import { useAuth } from "../features/editor/useAuth";
import ResultCard from "../components/editor/ResultCard";
import HistoryList from "../components/editor/HistoryList";
import HistoryModal from "../components/editor/HistoryModal";
import HistoryChart from "../components/editor/HistoryChart";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import { useLoadingOverlay } from "../features/ui/useLoadingOverlay";
import AuthModal from "../components/editor/AuthModal";
import Modal from "../components/ui/Modal";
import ReviewWidget from "../components/editor/ReviewWidget";
import { parseAuthParams } from "../lib/authReturn";

export default function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"arquivo" | "texto">("arquivo");
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const { loading, error, result, history, stats, sendText, sendFile, saveReview, credits, freeRemaining, requiresAuth, requiresPayment, showAuthNudge, loadProfile, lastEssayId, lastReview } = useEditor();
  const { user, loadMe } = useAuth();
  const loadingOverlay = useLoadingOverlay();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);

  useEffect(() => {
    ensureAnonSession();
  }, []);

  useEffect(() => {
    const { token, next } = parseAuthParams(location.search, location.hash);
    if (!token) return;
    const targetNext = next || location.pathname;
    const params = new URLSearchParams();
    params.set("token", token);
    params.set("next", targetNext);
    navigate(`/auth/confirmed?${params.toString()}`, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const wantsSignup = params.get("signup") === "1";
    const wantsLogin = params.get("login") === "1";
    if (wantsSignup || wantsLogin) {
      setAuthMode(wantsSignup ? "register" : "login");
      setAuthOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (loading) {
      loadingOverlay.show();
    } else {
      loadingOverlay.hide();
    }
  }, [loading, loadingOverlay]);

  useEffect(() => {
    if (requiresAuth) {
      setAuthOpen(true);
    }
  }, [requiresAuth]);

  useEffect(() => {
    if (requiresPayment) {
      window.location.href = "/paywall";
    }
  }, [requiresPayment]);

  useEffect(() => {
    if (!lastEssayId) return;
    if (lastReview?.stars && lastReview.stars > 0) return;
    const timer = window.setTimeout(() => setReviewPopupOpen(true), 10000);
    return () => window.clearTimeout(timer);
  }, [lastEssayId, lastReview]);

  const handleTextSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const tema = String(formData.get("tema") || "");
    const texto = String(formData.get("texto") || "");
    await sendText(tema, texto);
  };

  const handleFileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await sendFile(formData);
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Helmet>
        <title>Editor · Mooose</title>
      </Helmet>

      <Header
        links={[
          { label: "Blog", href: "/blog" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Sobre", href: "/sobre" }
        ]}
        ctaLabel="Comprar créditos"
        ctaHref="/paywall"
      />

      <main className="pb-12">
        <Section className="pt-8" title={`Área do aluno${user?.full_name ? ", " + user.full_name.split(" ")[0] : ""}`} subtitle="Envie sua redação e receba feedback no padrão ENEM.">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-text-muted">Correções disponíveis</p>
                  <p className="text-2xl font-bold text-text">{credits ?? "—"}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => (window.location.href = "/paywall")}>Comprar créditos</Button>
              </div>
              <p className="mt-3 text-sm text-text-muted">
                {credits !== null && credits <= 0
                  ? "Você está sem correções disponíveis. Desbloqueie correções para continuar seu treino."
                  : "Cada correção consome 1 correção disponível."}
              </p>
              {freeRemaining !== null && !user && (
                <p className="mt-2 text-xs text-brand">{freeRemaining > 0 ? `${freeRemaining} grátis disponível` : "Grátis usado"}</p>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-text">Resumo rápido</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted">Média</p>
                  <p className="text-lg font-semibold">{stats.avg.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-text-muted">Melhor</p>
                  <p className="text-lg font-semibold">{stats.best.toFixed(0)}</p>
                </div>
              </div>
            </Card>
          </div>
        </Section>

        <Section title="Nova correção" subtitle="Escolha enviar por foto/PDF ou texto digitado.">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex gap-2">
                <button className={`switch-tab ${tab === "arquivo" ? "active" : ""}`} onClick={() => setTab("arquivo")}>📸 Foto / PDF</button>
                <button className={`switch-tab ${tab === "texto" ? "active" : ""}`} onClick={() => setTab("texto")}>⌨️ Digitar texto</button>
              </div>

              {tab === "arquivo" ? (
                <div className="mt-4">
                  <form onSubmit={handleFileSubmit}>
                    <div className="input-group" style={{ marginBottom: "1rem" }}>
                      <label>Tema da redação</label>
                      <input type="text" name="tema" placeholder="Ex.: Invisibilidade do trabalho de cuidado" required />
                    </div>
                    <div className="input-group" style={{ marginBottom: "1rem" }}>
                      <label>Foto ou PDF da redação</label>
                      <input type="file" name="arquivo" accept="image/*,application/pdf" required />
                    </div>
                    <button type="submit" className="duo-btn btn-success" disabled={loading}>Enviar para correção</button>
                  </form>
                </div>
              ) : (
                <div className="mt-4">
                  <form onSubmit={handleTextSubmit}>
                    <div className="input-group" style={{ marginBottom: "1rem" }}>
                      <label>Tema da redação</label>
                      <input type="text" name="tema" placeholder="Tema da redação" required />
                    </div>
                    <div className="input-group" style={{ marginBottom: "1rem" }}>
                      <label>Texto</label>
                      <textarea name="texto" rows={10} placeholder="Escreva sua redação aqui..." className="input-text-area" required></textarea>
                    </div>
                    <button type="submit" className="duo-btn btn-success" disabled={loading}>Enviar para correção</button>
                  </form>
                </div>
              )}

              {error && <p className="form-message error">{error}</p>}
              {showAuthNudge && !user && (
                <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs text-brand">
                  Para continuar corrigindo, crie sua conta gratuita.
                  <button className="ml-2 underline" onClick={() => setAuthOpen(true)}>Entrar ou criar conta</button>
                </div>
              )}
            </Card>

            <ResultCard result={result} essayId={lastEssayId} initialReview={lastReview} onSaveReview={(id, stars, comment) => saveReview(id, stars, comment)} />
          </div>
        </Section>

        <Section title="Sua evolução">
          <Card className="p-6">
            <HistoryChart items={history} />
            <HistoryList items={history} onOpen={setSelectedHistory} />
          </Card>
        </Section>
      </main>

      <HistoryModal
        open={Boolean(selectedHistory)}
        onClose={() => setSelectedHistory(null)}
        item={selectedHistory}
        onSaveReview={(essayId, stars, comment) => saveReview(essayId, stars, comment)}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnPath="/editor"
        defaultMode={authMode}
        onSuccess={async () => {
          await loadMe();
          await loadProfile();
        }}
      />

      <Modal open={reviewPopupOpen} onClose={() => setReviewPopupOpen(false)} title="Avalie agora">
        {lastEssayId ? (
          <ReviewWidget
            essayId={lastEssayId}
            initialStars={lastReview?.stars || 0}
            initialComment={lastReview?.comment || ""}
            onSave={async (stars, comment) => {
              await saveReview(lastEssayId, stars, comment);
              setReviewPopupOpen(false);
            }}
          />
        ) : null}
      </Modal>

      <LoadingOverlay visible={loadingOverlay.visible} message={loadingOverlay.message} />

      <Footer />
    </div>
  );
}
