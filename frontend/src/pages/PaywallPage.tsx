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
import { useAuth, SubscriptionInfo } from "../features/editor/useAuth";

interface Plan {
  slug: "individual" | "basic_monthly" | "basic_annual" | "full_monthly" | "full_annual";
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
    title: "Avulso",
    quantity: "1 correção",
    price: "R$ 1,90",
    per: "R$ 1,90 por correção",
    label: "Para corrigir agora",
    note: "Pagamento único. Fica disponível na sua conta.",
    buttonTone: "secondary"
  },
  {
    slug: "basic_monthly",
    title: "Básico Mensal",
    quantity: "10 correções/mês",
    price: "R$ 9,90",
    per: "Cobrança mensal",
    highlight: "highlight",
    badge: "Recomendado",
    label: "Para treinar toda semana",
    note: "10 correções renovadas a cada mês.",
    indicado: "Indicado para: quem quer constância sem gastar demais.",
    buttonTone: "primary"
  },
  {
    slug: "basic_annual",
    title: "Básico Anual",
    quantity: "10 correções/mês",
    price: "R$ 99,00",
    per: "2 meses grátis",
    economy: "Pague 10 meses",
    label: "Para estudar o ano todo",
    note: "Mesmo limite mensal do Básico, com desconto anual.",
    buttonTone: "secondary"
  },
  {
    slug: "full_monthly",
    title: "Full Mensal",
    quantity: "Ilimitado",
    price: "R$ 19,90",
    per: "Cobrança mensal",
    highlight: "highlight-alt",
    badge: "Ilimitado",
    label: "Para evolução acelerada",
    note: "Correções ilimitadas para uso individual, com política antiabuso.",
    indicado: "Indicado para: quem quer treinar muito.",
    buttonTone: "primary"
  },
  {
    slug: "full_annual",
    title: "Full Anual",
    quantity: "Ilimitado",
    price: "R$ 199,00",
    per: "2 meses grátis",
    economy: "Pague 10 meses",
    label: "Melhor custo para uso intenso",
    note: "Full ilimitado anual para uso individual.",
    buttonTone: "secondary"
  }
] as const;

const planLabels: Record<string, string> = {
  basic_monthly: "Básico Mensal",
  basic_annual: "Básico Anual",
  full_monthly: "Full Mensal",
  full_annual: "Full Anual"
};

function normalizePlanSlug(plan: string) {
  const allowed = ["individual", "basic_monthly", "basic_annual", "full_monthly", "full_annual"];
  return allowed.includes(plan) ? plan : "basic_monthly";
}

export default function PaywallPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const loadingOverlay = useLoadingOverlay();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, loadMe } = useAuth();
  const subscription = user?.subscription as SubscriptionInfo | null | undefined;

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
      const res = await fetch(`${API_BASE}/abacatepay/checkout/${planSlug}`, {
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
            <p className="card-sub">Escolha créditos avulsos ou uma assinatura para treinar com constância.</p>
            {subscription?.active && (
              <div className="app-card plan-current">
                <strong>Plano atual: {planLabels[subscription.plan_code || ""] || "Assinatura ativa"}</strong>
                <span>
                  {subscription.usage_limit
                    ? `${subscription.usage_used || 0}/${subscription.usage_limit} correções usadas neste mês`
                    : `${subscription.daily_corrections_used || 0} correções usadas hoje`}
                </span>
                {subscription.current_period_end && (
                  <span>Renova em {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            )}
            <div className="plan-grid">
              {plans.map((plan) => {
                const isLoading = loadingPlan === plan.slug;
                const isCurrentPlan = subscription?.active && subscription.plan_code === plan.slug;
                const hasOtherSubscription = subscription?.active && plan.slug !== "individual" && subscription.plan_code !== plan.slug;
                const buttonClass = `duo-btn btn-${plan.buttonTone} full${isLoading || isCurrentPlan || hasOtherSubscription ? " is-disabled" : ""}`;
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
                      disabled={isLoading || isCurrentPlan || Boolean(hasOtherSubscription)}
                      aria-busy={isLoading}
                    >
                      {isLoading ? "Carregando..." : isCurrentPlan ? "Plano atual" : hasOtherSubscription ? "Troca em breve" : "Escolher pacote"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="app-card plan-accordion">
              <details className="plan-accordion-item">
                <summary>Como funciona</summary>
                <p>O avulso adiciona 1 crédito. As assinaturas liberam correções conforme o plano escolhido.</p>
                <p>O plano Full é ilimitado para uso individual, com limite técnico antiabuso.</p>
              </details>
              <details className="plan-accordion-item">
                <summary>Como funciona o anual?</summary>
                <p>Você paga 10 meses e usa por 12 meses na modalidade escolhida.</p>
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
        onSuccess={async () => { await loadMe(); }}
      />

      <LoadingOverlay visible={loadingOverlay.visible} message={loadingOverlay.message} />
    </div>
  );
}
