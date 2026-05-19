import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Pencil, Save, Trash2, UserRound, X } from "lucide-react";
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
import { normalizeScore } from "../lib/normalize";
import { isOcrError, sortHistorico } from "../services/enemHistorico";

const avatarOptions = [
  { id: "green", label: "Verde" },
  { id: "blue", label: "Azul" },
  { id: "gray", label: "Cinza" },
  { id: "black", label: "Preto" },
  { id: "pink", label: "Rosa" }
] as const;

type AvatarId = typeof avatarOptions[number]["id"];

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
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    bio: "",
    profile_avatar: "green" as AvatarId
  });

  const { loading, error, result, history, stats, sendText, sendFile, saveReview, credits, requiresAuth, requiresPayment, showAuthNudge, loadProfile, refreshHistory, lastEssayId, lastReview } = useEditor();
  const { user, loadMe, logout, updateProfile, deleteAccount } = useAuth();
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
      if (getToken()) {
        navigate("/editor", { replace: true });
        return;
      }
      setAuthMode(wantsSignup ? "register" : "login");
      setAuthOpen(true);
    }
  }, [location.search, navigate]);

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

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || "",
      bio: user?.bio || "",
      profile_avatar: (user?.profile_avatar || "green") as AvatarId
    });
  }, [user]);

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

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        bio: profileForm.bio,
        profile_avatar: profileForm.profile_avatar
      });
      await loadMe();
      setProfileEditing(false);
      toast.push("Perfil atualizado!");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Não foi possível atualizar o perfil.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      await deleteAccount();
      toast.push("Conta excluída.");
      navigate("/", { replace: true });
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Não foi possível excluir a conta.", "error");
    } finally {
      setDeleteAccountLoading(false);
      setDeleteAccountOpen(false);
    }
  };

  const sortedHistory = useMemo(() => sortHistorico(history || []), [history]);
  const latest = sortedHistory[0];
  const latestIsOcrError = latest ? isOcrError(latest) : false;
  const latestScore = normalizeScore(latest?.nota_final);
  const mainTitle = latest?.tema ? latest.tema : "Sua próxima redação";
  const mainSubtitle = latestIsOcrError
    ? "A última tentativa teve falha de OCR. Tente reenviar com imagem/PDF mais nítido."
    : latestScore !== null
      ? `Última nota: ${Math.round(latestScore)}`
      : "Envie uma redação e receba feedback completo.";

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
            items={sortedHistory}
            loading={loading && !history.length}
            onOpen={(item) => navigate(`/historico/${item.id}`)}
            onViewAll={() => navigate("/historico")}
            getScoreLabel={(item) => (isOcrError(item) ? "Erro OCR" : normalizeScore(item?.nota_final) ?? "—")}
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
            <button type="button" className="dashboard-link" onClick={() => navigate("/historico")}>
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
                  Para corrigir, crie sua conta e escolha um pacote.
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
            <HistoryChart items={sortedHistory} />
          </Card>
          <div className="dashboard-list">
            <HistoryList items={sortedHistory} onOpen={setSelectedHistory} />
          </div>
        </section>
      );
    }

    const avatarId = (user?.profile_avatar || profileForm.profile_avatar || "green") as AvatarId;
    const displayName = user?.full_name || "Aluno Mooose";
    const bio = user?.bio || "Adicione uma descrição curta sobre seus objetivos de estudo.";
    const completedCount = sortedHistory.filter((item) => !isOcrError(item) && normalizeScore(item?.nota_final) !== null).length;
    const lastCorrectionDate = latest?.created_at
      ? new Date(latest.created_at).toLocaleDateString("pt-BR")
      : "Nenhuma ainda";

    return (
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Perfil</h3>
        </div>
        <div className="profile-layout">
          <Card className="dashboard-card profile-card">
            <div className="profile-hero">
              <div className={`profile-avatar profile-avatar-${avatarId}`}>
                <UserRound size={34} />
              </div>
              <div className="profile-identity">
                <p className="dashboard-profile">{displayName}</p>
                <p className="dashboard-profile-email"><Mail size={14} /> {user?.email || ""}</p>
                <p className="profile-bio">{bio}</p>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div>
                <span>Correções disponíveis</span>
                <strong>{credits ?? user?.credits ?? 0}</strong>
              </div>
              <div>
                <span>Redações corrigidas</span>
                <strong>{completedCount}</strong>
              </div>
              <div>
                <span>Média atual</span>
                <strong>{stats.avg.toFixed(0)}</strong>
              </div>
              <div>
                <span>Última correção</span>
                <strong>{lastCorrectionDate}</strong>
              </div>
            </div>

            <div className="dashboard-profile-actions">
              <Button variant="secondary" onClick={() => setProfileEditing(true)}>
                <Pencil size={16} /> Editar perfil
              </Button>
              <Button variant="secondary" onClick={() => window.location.href = "/paywall"}>Comprar créditos</Button>
              <Button onClick={() => { logout(); navigate("/"); }}>Sair</Button>
            </div>
          </Card>

          <Card className="dashboard-card profile-card">
            <h4 className="profile-section-title">Preferências visuais</h4>
            <div className="profile-avatar-row">
              {avatarOptions.map((option) => (
                <div key={option.id} className="profile-avatar-choice">
                  <div className={`profile-avatar profile-avatar-sm profile-avatar-${option.id}`}>
                    <UserRound size={20} />
                  </div>
                  <span>{option.label}</span>
                </div>
              ))}
            </div>
            <div className="profile-info-list">
              <div><span>Nome público</span><strong>{displayName}</strong></div>
              <div><span>E-mail</span><strong>{user?.email || ""}</strong></div>
              <div><span>Melhor nota</span><strong>{stats.best.toFixed(0)}</strong></div>
              <div><span>Status</span><strong>{(credits ?? 0) > 0 ? "Pronto para corrigir" : "Sem créditos"}</strong></div>
            </div>
            <button type="button" className="profile-danger-link" onClick={() => setDeleteAccountOpen(true)}>
              <Trash2 size={16} /> Excluir minha conta
            </button>
          </Card>
        </div>
      </section>
    );
  }, [activeTab, credits, error, formTab, history.length, latest, loading, mainSubtitle, mainTitle, lastEssayId, lastReview, logout, navigate, profileForm.profile_avatar, result, saveReview, showAuthNudge, sortedHistory, stats.avg, stats.best, user]);

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
        onRanking={() => toast.push("Ranking em breve!")}
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
          navigate("/editor", { replace: true });
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

      <Modal open={profileEditing} onClose={() => setProfileEditing(false)} title="Editar perfil" className="profile-edit-modal">
        <form onSubmit={handleProfileSave} className="profile-edit-form">
          <label>
            Nome
            <input
              value={profileForm.full_name}
              onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="Seu nome"
              maxLength={120}
            />
          </label>
          <label>
            Descrição
            <textarea
              value={profileForm.bio}
              onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Conte um pouco sobre sua meta de estudo"
              maxLength={500}
              rows={4}
            />
          </label>
          <div>
            <span className="profile-edit-label">Imagem do perfil</span>
            <div className="profile-avatar-selector">
              {avatarOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`profile-avatar-select ${profileForm.profile_avatar === option.id ? "active" : ""}`}
                  onClick={() => setProfileForm((current) => ({ ...current, profile_avatar: option.id }))}
                  aria-label={`Selecionar avatar ${option.label}`}
                >
                  <span className={`profile-avatar profile-avatar-sm profile-avatar-${option.id}`}>
                    <UserRound size={20} />
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="profile-edit-actions">
            <Button type="button" variant="secondary" onClick={() => setProfileEditing(false)}>
              <X size={16} /> Cancelar
            </Button>
            <Button type="submit" loading={profileSaving}>
              <Save size={16} /> Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="Excluir conta">
        <div className="profile-delete-modal">
          <p>Essa ação remove sua conta, redações, histórico e avaliações. Ela não pode ser desfeita.</p>
          <div className="profile-edit-actions">
            <Button type="button" variant="secondary" onClick={() => setDeleteAccountOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleDeleteAccount} loading={deleteAccountLoading} className="profile-delete-button">
              <Trash2 size={16} /> Excluir conta
            </Button>
          </div>
        </div>
      </Modal>

      <LoadingOverlay visible={loadingOverlay.visible} message={loadingOverlay.message} />
    </div>
  );
}
