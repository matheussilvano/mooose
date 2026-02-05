import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import MainCard from "../components/dashboard/MainCard";
import RecentCorrections from "../components/dashboard/RecentCorrections";
import BottomNav, { DashboardTab } from "../components/dashboard/BottomNav";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import HistoryChart from "../components/editor/HistoryChart";
import HistoryList from "../components/editor/HistoryList";
import HistoryModal from "../components/editor/HistoryModal";
import ResultCard from "../components/editor/ResultCard";
import AuthModal from "../components/editor/AuthModal";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import Modal from "../components/ui/Modal";
import ReviewWidget from "../components/editor/ReviewWidget";
import { useEditor } from "../features/editor/useEditor";
import { useAuth } from "../features/editor/useAuth";
import { useLoadingOverlay } from "../features/ui/useLoadingOverlay";
import { ensureAnonSession } from "../lib/anon";
import { parseAuthParams } from "../lib/authReturn";
import { useToast } from "../components/ui/Toast";
import { getToken } from "../lib/auth";

export default function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [formTab, setFormTab] = useState<"arquivo" | "texto">("arquivo");
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);

  const { loading, error, result, history, stats, sendText, sendFile, saveReview, credits, freeRemaining, requiresAuth, requiresPayment, showAuthNudge, loadProfile, refreshHistory, lastEssayId, lastReview } = useEditor();
  const { user, loadMe, logout } = useAuth();
  const loadingOverlay = useLoadingOverlay();

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
    if (loading) loadingOverlay.show();
    else loadingOverlay.hide();
  }, [loading, loadingOverlay]);

  useEffect(() => {
    if (requiresAuth) setAuthOpen(true);
  }, [requiresAuth]);

  useEffect(() => {
    if (requiresPayment) window.location.href = "/paywall";
  }, [requiresPayment]);

  useEffect(() => {
    if (getToken()) {
      loadProfile();
      refreshHistory();
    }
  }, [loadProfile, refreshHistory, user]);

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
    await sendText(String(formData.get("tema") || ""), String(formData.get("texto") || ""));
  };

  const handleFileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    await sendFile(formData);
  };

  const latest = history[0];
  const mainTitle = latest?.tema ? latest.tema : "Sua próxima redação";
  const mainSubtitle = latest?.nota_final ? `Última nota: ${latest.nota_final}` : "Envie uma redação e receba feedback completo.";

  const handleTabChange = (tab: DashboardTab) => {
    if (tab === "shop") {
      window.location.href = "/paywall";
      return;
    }
    setActiveTab(tab);
  };

  const dashboardContent = useMemo(() => {
    if (activeTab === "home") {
      return (
        <>
          <MainCard
            title={mainTitle}
            subtitle={mainSubtitle}
            badge={latest ? "Última redação" : "Comece agora"}
            onPrimary={() => setActiveTab("new")}
          />
          <RecentCorrections
            items={history}
            loading={loading && !history.length}
            onOpen={setSelectedHistory}
            onViewAll={() => setActiveTab("history")}
          />
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h3>Resumo rápido</h3>
            </div>
            <div className="dashboard-summary">
              <div>
                <span>Média</span>
                <strong>{stats.avg.toFixed(0)}</strong>
              </div>
              <div>
                <span>Melhor</span>
                <strong>{stats.best.toFixed(0)}</strong>
              </div>
            </div>
          </section>
        </>
      );
    }

    if (activeTab === "new") {
      return (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>Nova correção</h3>
            <button type="button" className="dashboard-link" onClick={() => setActiveTab("history")}>
              Ver histórico
            </button>
          </div>
          <div className="dashboard-grid">
            <Card className="dashboard-card">
              <div className="dashboard-tabs">
                <button className={`dashboard-tab ${formTab === "arquivo" ? "active" : ""}`} onClick={() => setFormTab("arquivo")}>📸 Foto / PDF</button>
                <button className={`dashboard-tab ${formTab === "texto" ? "active" : ""}`} onClick={() => setFormTab("texto")}>⌨️ Digitar texto</button>
              </div>
              {formTab === "arquivo" ? (
                <form onSubmit={handleFileSubmit} className="dashboard-form">
                  <div className="input-group">
                    <label>Tema da redação</label>
                    <input type="text" name="tema" placeholder="Ex.: Invisibilidade do trabalho de cuidado" required />
                  </div>
                  <div className="input-group">
                    <label>Foto ou PDF da redação</label>
                    <input type="file" name="arquivo" accept="image/*,application/pdf" required />
                  </div>
                  <button type="submit" className="duo-btn btn-success" disabled={loading}>Enviar para correção</button>
                </form>
              ) : (
                <form onSubmit={handleTextSubmit} className="dashboard-form">
                  <div className="input-group">
                    <label>Tema da redação</label>
                    <input type="text" name="tema" placeholder="Tema da redação" required />
                  </div>
                  <div className="input-group">
                    <label>Texto</label>
                    <textarea name="texto" rows={10} placeholder="Escreva sua redação aqui..." className="input-text-area" required />
                  </div>
                  <button type="submit" className="duo-btn btn-success" disabled={loading}>Enviar para correção</button>
                </form>
              )}
              {error && <p className="form-message error">{error}</p>}
              {showAuthNudge && !user && (
                <div className="dashboard-nudge">
                  Para continuar corrigindo, crie sua conta gratuita.
                  <button onClick={() => setAuthOpen(true)}>Entrar ou criar conta</button>
                </div>
              )}
            </Card>
            <ResultCard result={result} essayId={lastEssayId} initialReview={lastReview} onSaveReview={(id, stars, comment) => saveReview(id, stars, comment)} />
          </div>
        </section>
      );
    }

    if (activeTab === "history") {
      return (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>Seu histórico</h3>
            <button type="button" className="dashboard-link" onClick={() => setActiveTab("new")}>
              Nova redação
            </button>
          </div>
          <Card className="dashboard-card">
            <HistoryChart items={history} />
          </Card>
          <div className="dashboard-list">
            <HistoryList items={history} onOpen={setSelectedHistory} />
          </div>
        </section>
      );
    }

    return (
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Perfil</h3>
        </div>
        <Card className="dashboard-card">
          <p className="dashboard-profile">{user?.full_name || "Aluno"}</p>
          <p className="dashboard-profile-email">{user?.email || ""}</p>
          <div className="dashboard-profile-actions">
            <Button variant="secondary" onClick={() => window.location.href = "/paywall"}>Comprar créditos</Button>
            <Button onClick={logout}>Sair</Button>
          </div>
        </Card>
      </section>
    );
  }, [activeTab, error, formTab, history, latest, loading, mainSubtitle, mainTitle, lastEssayId, lastReview, logout, result, saveReview, showAuthNudge, stats.avg, stats.best, user]);

  return (
    <div className="dashboard-page">
      <Helmet>
        <title>Área do aluno · Mooose</title>
      </Helmet>

      <div className="dashboard-bg">
        <div className="dashboard-blob blob-a" aria-hidden="true" />
        <div className="dashboard-blob blob-b" aria-hidden="true" />
      </div>

      <DashboardHeader
        credits={credits}
        streak={0}
        onCredits={() => (window.location.href = "/paywall")}
        onStreak={() => toast.push("Ofensiva em breve!")}
        onBonus={() => toast.push("Bônus em breve!")}
      />

      <main className="dashboard-content">
        {dashboardContent}
      </main>

      <BottomNav active={activeTab} onChange={handleTabChange} />

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
    </div>
  );
}
