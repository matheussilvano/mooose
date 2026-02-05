import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { API_BASE } from "../lib/api";
import { getAuthHeaders, getToken } from "../lib/auth";
import { ensureAnonSession } from "../lib/anon";
import { parseAuthParams, setAuthReturnPath } from "../lib/authReturn";
import { useToast } from "../components/ui/Toast";
import { useLoadingOverlay } from "../features/ui/useLoadingOverlay";
import LoadingOverlay from "../components/ui/LoadingOverlay";
import AuthModal from "../components/editor/AuthModal";

interface Plan {
  slug: "individual" | "padrao" | "intensivao";
  title: string;
  quantity: string;
  price: string;
  per: string;
  highlight?: "highlight" | "highlight-alt";
  badge?: string;
  economy?: string;
  label: string;
  note: string;
  indicado?: string;
  buttonTone: "primary" | "secondary";
}

const plans: Plan[] = [
  {
    slug: "individual",
    title: "Pacote Individual",
    quantity: "1 correção",
    price: "R$ 1,90",
    per: "R$ 1,90 por correção",
    label: "Para corrigir agora",
    note: "Indicado para: quem precisa de uma correção pontual.",
    buttonTone: "secondary"
  },
  {
    slug: "padrao",
    title: "Pacote Padrão",
    quantity: "10 correções",
    price: "R$ 9,90",
    per: "R$ 0,99 por correção",
    highlight: "highlight",
    badge: "Recomendado",
    economy: "Economize 48%",
    label: "Para treinar toda semana",
    note: "Melhor equilíbrio entre preço e constância.",
    indicado: "Indicado para: quem quer constância sem gastar demais.",
    buttonTone: "primary"
  },
  {
    slug: "intensivao",
    title: "Pacote Intensivão",
    quantity: "25 correções",
    price: "R$ 19,90",
    per: "R$ 0,79 por correção",
    highlight: "highlight-alt",
    badge: "Melhor valor",
    economy: "Economize 58%",
    label: "Para evolução acelerada",
    note: "Indicado para: quem quer avançar rápido e treinar muito.",
    buttonTone: "primary"
  }
] as const;

function normalizePlanSlug(plan: string) {
  const allowed = ["individual", "padrao", "intensivao"];
  return allowed.includes(plan) ? plan : "padrao";
}

export default function PaywallPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const loadingOverlay = useLoadingOverlay();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

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

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/editor", { replace: true });
    }
  };

  const handleCheckout = async (plan: string) => {
    if (!getToken()) {
      setAuthReturnPath("/paywall");
      setAuthOpen(true);
      return;
    }
    if (loadingPlan) return;
    setLoadingPlan(plan);
    loadingOverlay.show("Abrindo checkout...");
    try {
      const planSlug = normalizePlanSlug(plan);
      const res = await fetch(`${API_BASE}/payments/create/${planSlug}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.checkout_url) {
        throw new Error(data?.detail || data?.message || "Falha ao iniciar o pagamento.");
      }
      window.location.href = data.checkout_url;
    } catch {
      toast.push("Não foi possível iniciar o pagamento. Tente novamente.", "error");
    } finally {
      setLoadingPlan(null);
      loadingOverlay.hide();
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <Helmet>
        <title>Mooose · Planos</title>
      </Helmet>

      <div className="credits-modal" role="dialog" aria-modal="true" aria-label="Escolha seu pacote de correções">
        <div className="credits-modal-backdrop" onClick={handleClose} />
        <div className="credits-modal-card paywall-card">
          <button className="credits-modal-close" type="button" onClick={handleClose} aria-label="Fechar">✕</button>
          <div className="no-credits-modal">
            <h3>Escolha seu pacote de correções</h3>
            <p className="card-sub">Receba feedback completo em minutos e evolua a cada redação.</p>
            <div className="plan-grid">
              {plans.map((plan) => {
                const isLoading = loadingPlan === plan.slug;
                const buttonClass = `duo-btn btn-${plan.buttonTone} full${isLoading ? " is-disabled" : ""}`;
                return (
                  <div key={plan.slug} className={`app-card plan-card${plan.highlight ? ` ${plan.highlight}` : ""}`}>
                    {plan.badge && (
                      <div className="plan-badges">
                        <span>{plan.badge}</span>
                      </div>
                    )}
                    <div className="plan-card-header">
                      <div>
                        <span className="plan-tag">{plan.title}</span>
                        <h3>{plan.quantity}</h3>
                      </div>
                      {plan.economy && <span className="plan-economy">{plan.economy}</span>}
                    </div>
                    <div className="plan-price">{plan.price}</div>
                    <div className="plan-meta">
                      <span>{plan.quantity}</span>
                      <span className="plan-meta-pill">{plan.per}</span>
                      {plan.economy && <span className="plan-meta-ghost">{plan.economy}</span>}
                    </div>
                    <p className="plan-sub">{plan.label}</p>
                    {plan.note && plan.badge && <div className="plan-reco-note">{plan.note}</div>}
                    <div className="plan-indicado">{plan.indicado || plan.note}</div>
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => handleCheckout(plan.slug)}
                      disabled={isLoading}
                      aria-busy={isLoading}
                    >
                      {isLoading ? "Carregando..." : "Escolher pacote"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="app-card plan-accordion">
              <details className="plan-accordion-item">
                <summary>Como funciona</summary>
                <p>Você compra um pacote e usa quando quiser.</p>
                <p>Cada correção equivale a 1 redação analisada.</p>
              </details>
              <details className="plan-accordion-item">
                <summary>As correções expiram?</summary>
                <p>Não. Ficam disponíveis na sua conta.</p>
              </details>
            </div>
            <button className="duo-btn btn-secondary paywall-dismiss" type="button" onClick={handleClose}>
              Agora não
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        returnPath="/paywall"
        onSuccess={async () => Promise.resolve()}
      />

      <LoadingOverlay visible={loadingOverlay.visible} message={loadingOverlay.message} />
    </div>
  );
}
