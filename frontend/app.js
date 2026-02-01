const API_BASE = "https://mooose-backend.onrender.com";

/* FRASES DE LOADING DIVERTIDAS */
const funnyMessages = [
  "Analisando competências...",
  "Gerando feedback...",
  "Calculando sua nota...",
  "Organizando sugestões...",
  "Revisando coesão e coerência...",
  "Preparando sua devolutiva..."
];
const PAYWALL_STORAGE_KEY = "mooose_paywall_after_free_shown";
const REFERRAL_STORAGE_KEY = "mooose_referral_code";
const DEVICE_FP_KEY = "mooose_device_fingerprint";
const ANON_ID_KEY = "mooose_anon_id";
const AUTH_RETURN_KEY = "mooose_auth_return";
const EDITOR_ROUTE = "/editor";
const PAYWALL_ROUTE = "/paywall";
const CONFIRM_ROUTE = "/auth/confirmed";
const DRAFT_TEXT_KEY = "mooose_draft_text";
const DRAFT_TEMA_KEY = "mooose_draft_tema";
const DRAFT_TEMA_FILE_KEY = "mooose_draft_tema_file";
const FREE_REMAINING_KEY = "mooose_free_remaining";
const PROGRESS_TARGET_SCORE = 1000;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

function generateAnonId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function setAnonCookie(id) {
  try {
    document.cookie = `mooose_anon_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    // ignore cookie errors
  }
}

function getAnonCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )mooose_anon_id=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function ensureAnonSession() {
  let anonId = null;
  try {
    anonId = localStorage.getItem(ANON_ID_KEY);
  } catch (err) {
    anonId = null;
  }
  if (!anonId) {
    const cookieId = getAnonCookie();
    if (cookieId) anonId = cookieId;
  }
  if (!anonId) {
    anonId = generateAnonId();
    try {
      localStorage.setItem(ANON_ID_KEY, anonId);
    } catch (err) {
      // ignore storage errors
    }
  }
  setAnonCookie(anonId);
  return anonId;
}

function getAnonId() {
  return ensureAnonSession();
}

ensureAnonSession();

function showLoading(msg) {
  const overlay = document.getElementById("loading-overlay");
  const msgEl = document.getElementById("loading-msg");
  if (overlay) overlay.classList.remove("hidden");
  
  if (msgEl) {
    if (msg) {
      msgEl.textContent = msg;
      if (msgEl.dataset.interval) clearInterval(msgEl.dataset.interval);
      return;
    }
    msgEl.textContent = funnyMessages[0];
    if (msgEl.dataset.interval) clearInterval(msgEl.dataset.interval);
    let i = 0;
    msgEl.dataset.interval = setInterval(() => {
      i = (i + 1) % funnyMessages.length;
      msgEl.textContent = funnyMessages[i];
    }, 2500);
  }
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  const msgEl = document.getElementById("loading-msg");
  if (overlay) overlay.classList.add("hidden");
  if (msgEl && msgEl.dataset.interval) clearInterval(msgEl.dataset.interval);
}

function trackEvent(name, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`.trim();
  toast.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}

async function loadPublicCorrectionsCount() {
  const countEls = Array.from(document.querySelectorAll("[data-public-corrections]"));
  if (!countEls.length) return;
  const fallbackText = (countEls[0].dataset.fallback || countEls[0].textContent || "").replace(/\D/g, "");
  const fallback = Number(fallbackText) || 0;
  const formatter = new Intl.NumberFormat("pt-BR");
  try {
    const res = await fetch(`${API_BASE}/admin/metrics/absolute`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("metrics_unavailable");
    const data = await res.json().catch(() => ({}));
    const total = Number(
      data?.corrections ??
      data?.total_corrections ??
      data?.correcoes ??
      data?.correcoes_realizadas ??
      data?.corrections_total ??
      data?.corrections_count ??
      null
    );
    if (!Number.isFinite(total) || total <= 0) throw new Error("invalid_count");
    countEls.forEach(el => {
      el.textContent = formatter.format(total);
    });
  } catch (err) {
    if (fallback > 0) {
      countEls.forEach(el => {
        el.textContent = formatter.format(fallback);
      });
    }
  }
}

function setAuthReturnPath(path) {
  if (!path) return;
  try {
    localStorage.setItem(AUTH_RETURN_KEY, path);
  } catch (err) {
    // ignore storage errors
  }
}

function peekAuthReturnPath() {
  try {
    return localStorage.getItem(AUTH_RETURN_KEY);
  } catch (err) {
    return "";
  }
}

function consumeAuthReturnPath() {
  try {
    const value = localStorage.getItem(AUTH_RETURN_KEY);
    localStorage.removeItem(AUTH_RETURN_KEY);
    return value;
  } catch (err) {
    return "";
  }
}

function setAppRoute(path, replace = false) {
  if (!path) return;
  if (window.history && typeof window.history.replaceState === "function") {
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", path);
  }
}

function openEditorView(options = {}) {
  setAppRoute(EDITOR_ROUTE, options.replace);
  showSection("section-landing");
  setLandingMode();
  if (typeof renderAppView === "function") {
    renderAppView("new");
  }
  updateFreeBadge();
  requestAnimationFrame(updateAppHeaderHeight);
}

function openPaywallView(options = {}) {
  setAppRoute(PAYWALL_ROUTE, options.replace);
  showSection("section-landing");
  setLandingMode();
  if (typeof renderAppView === "function") {
    renderAppView("buy");
  }
  requestAnimationFrame(updateAppHeaderHeight);
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("visible"));
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
  const isLanding = id === "section-landing";
  const shouldShell = isLanding && shouldShowAppShell();
  document.body.classList.toggle("app-shell", shouldShell);
  const appBar = document.getElementById("app-bottom-bar");
  if (appBar) appBar.classList.toggle("hidden", !shouldShell);
  const creditsSheet = document.getElementById("credits-sheet");
  if (creditsSheet) creditsSheet.classList.add("hidden");
  if (isLanding) setLandingMode();
  if (shouldShell && typeof renderAppView === "function") {
    renderAppView(currentAppView || "home");
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  requestAnimationFrame(updateAppHeaderHeight);
}

function updateAppHeaderHeight() {
  const header = document.querySelector(".topbar");
  if (!header) return;
  const height = Math.ceil(header.getBoundingClientRect().height);
  if (height > 0) {
    document.documentElement.style.setProperty("--app-header-height", `${height}px`);
  }
}

function setLandingMode() {
  const landingPublic = document.querySelector("[data-landing-public]");
  const landingApp = document.querySelector("[data-landing-app]");
  if (!landingPublic && !landingApp) return;
  const shouldShowApp = shouldShowAppShell();
  if (landingPublic) landingPublic.classList.toggle("hidden", shouldShowApp);
  if (landingApp) landingApp.classList.toggle("hidden", !shouldShowApp);
}

/* AUTH & TOKEN */
function getToken() { return localStorage.getItem("token"); }
function setToken(t) { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); }
function getAuthHeaders(extra = {}, options = {}) {
  const t = getToken();
  const headers = {
    ...(options.skipContentType ? {} : { "Content-Type": "application/json" }),
    "X-ANON-ID": getAnonId(),
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
  return { ...headers, ...extra };
}

let updateTopbarUser = () => {};
let renderAppView = () => {};
let currentAppView = "home";
let loadHistoricoFn = null;
let chartInstance = null;
let appChartInstance = null;
let currentCredits = null;
let freeRemaining = null;
let pendingNextRoute = "";
let lastEssayId = null;
let lastReview = null;
let lastResult = null;
let lastTema = "";
let reviewPopupTimer = null;
let reviewPopupShown = false;
let checkoutInProgress = false;
let reviewPopupObserver = null;
let paywallShownInSession = false;
let currentReferralCode = "";
let currentReferralLink = "";
let toastTimer = null;
let historyCache = new Map();
let historyEndObserver = null;
const WEEK_THEME_TEXT = "Os impactos do uso excessivo das redes sociais na saúde mental dos jovens no Brasil";

function shouldUseAppShell() {
  return Boolean(document.querySelector(".app-views") && document.getElementById("app-bottom-bar"));
}

function isEditorRoute() {
  const params = new URLSearchParams(window.location.search);
  return (
    window.location.pathname.startsWith(EDITOR_ROUTE) ||
    window.location.pathname.startsWith("/app/editor") ||
    params.get("editor") === "1"
  );
}

function isPaywallRoute() {
  const params = new URLSearchParams(window.location.search);
  return (
    window.location.pathname.startsWith(PAYWALL_ROUTE) ||
    window.location.pathname.startsWith("/app/paywall") ||
    params.get("paywall") === "1"
  );
}

function isConfirmRoute() {
  return window.location.pathname.startsWith(CONFIRM_ROUTE) || window.location.pathname.startsWith("/auth/confirmed");
}

function shouldShowAppShell() {
  return shouldUseAppShell() && (Boolean(getToken()) || isEditorRoute() || isPaywallRoute());
}

function normalizeCredits(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

function normalizeScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getDeviceFingerprint() {
  try {
    let fp = localStorage.getItem(DEVICE_FP_KEY);
    if (!fp) {
      fp = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_FP_KEY, fp);
    }
    return fp;
  } catch (err) {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getStoredReferralCode() {
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY) || "";
  } catch (err) {
    return "";
  }
}

function applyReferralCode(code) {
  const normalized = String(code || "").trim();
  currentReferralCode = normalized;
  try {
    if (normalized) localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
    else localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (err) {
    // ignore storage errors
  }
  updateReferralAppliedUI(normalized);
}

function updateReferralAppliedUI(code) {
  const container = document.querySelector("[data-referral-applied]");
  const codeEl = document.querySelector("[data-register-ref-code]");
  if (!container || !codeEl) return;
  if (code) {
    container.classList.remove("hidden");
    codeEl.textContent = code;
  } else {
    container.classList.add("hidden");
    codeEl.textContent = "";
  }
}

function extractCredits(data) {
  if (!data) return null;
  const sources = [data, data.user, data.account, data.profile];
  const keys = [
    "credits",
    "creditos",
    "creditos_disponiveis",
    "credits_available",
    "correcoes_disponiveis",
    "corrections_left",
    "saldo_creditos",
    "credit_balance"
  ];
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const value = normalizeCredits(src[key]);
      if (value !== null) return value;
    }
  }
  return null;
}

function extractFreeRemaining(data) {
  if (!data) return null;
  const sources = [data, data.user, data.account, data.profile];
  const keys = [
    "free_remaining",
    "freeRemaining",
    "free_left",
    "free_corrections_left"
  ];
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const raw = src[key];
      if (raw === null || raw === undefined) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function updateFreeRemaining(value) {
  if (value === null || value === undefined) return;
  freeRemaining = Math.max(0, Math.round(Number(value) || 0));
  try {
    localStorage.setItem(FREE_REMAINING_KEY, String(freeRemaining));
  } catch (err) {
    // ignore storage errors
  }
  updateFreeBadge();
}

function updateFreeBadge() {
  const badge = document.querySelector("[data-free-badge]");
  if (!badge) return;
  if (getToken()) {
    badge.classList.add("hidden");
    return;
  }
  const value = freeRemaining !== null ? freeRemaining : 1;
  badge.textContent = value > 0 ? `${value} grátis disponível` : "Grátis usado";
  badge.classList.remove("hidden");
}

function loadStoredFreeRemaining() {
  try {
    const stored = localStorage.getItem(FREE_REMAINING_KEY);
    if (stored === null) return;
    const value = Number(stored);
    if (Number.isFinite(value)) {
      freeRemaining = Math.max(0, Math.round(value));
    }
  } catch (err) {
    // ignore storage errors
  }
}

function saveDraftText(text, tema) {
  try {
    if (typeof text === "string") localStorage.setItem(DRAFT_TEXT_KEY, text);
    if (typeof tema === "string") localStorage.setItem(DRAFT_TEMA_KEY, tema);
  } catch (err) {
    // ignore storage errors
  }
}

function saveDraftFileTema(tema) {
  try {
    if (typeof tema === "string") localStorage.setItem(DRAFT_TEMA_FILE_KEY, tema);
  } catch (err) {
    // ignore storage errors
  }
}

function restoreDrafts() {
  try {
    const text = localStorage.getItem(DRAFT_TEXT_KEY) || "";
    const tema = localStorage.getItem(DRAFT_TEMA_KEY) || "";
    const temaFile = localStorage.getItem(DRAFT_TEMA_FILE_KEY) || "";
    const textArea = document.querySelector("textarea[name='texto_app']");
    const temaInput = document.querySelector("input[name='tema_app']");
    const temaFileInput = document.querySelector("input[name='tema_app_file']");
    if (textArea && !textArea.value) textArea.value = text;
    if (temaInput && !temaInput.value) temaInput.value = tema;
    if (temaFileInput && !temaFileInput.value) temaFileInput.value = temaFile;
  } catch (err) {
    // ignore storage errors
  }
}

function buildTextPayload(tema, texto) {
  return JSON.stringify({
    tema,
    texto
  });
}

function buildFilePayload(form) {
  const fileInput = form?.querySelector('input[type="file"]');
  const temaInput = form?.querySelector('input[name*="tema"]');
  const file = fileInput?.files?.[0] || null;
  const tema = temaInput?.value || "";
  const fd = new FormData();
  if (file) {
    fd.append("arquivo", file);
  }
  if (tema) {
    fd.append("tema", tema);
  }
  return fd;
}

function updateCreditCardCopy(credits) {
  const infoEl = document.querySelector("[data-credit-info]");
  if (!infoEl) return;
  if (credits !== null && Number(credits) <= 0) {
    infoEl.textContent = "Você está sem correções disponíveis. Desbloqueie correções para continuar seu treino.";
  } else {
    infoEl.textContent = "Cada correção consome 1 correção disponível.";
  }
}

function updateCreditLockState(credits) {
  const locked = credits !== null && Number(credits) <= 0;
  document.querySelectorAll("[data-credit-lock]").forEach(el => {
    el.classList.toggle("hidden", !locked);
  });
  document.querySelectorAll("[data-send-btn]").forEach(btn => {
    btn.classList.toggle("is-disabled", locked);
    btn.setAttribute("aria-disabled", locked ? "true" : "false");
  });
}

function setCreditsUI(value) {
  currentCredits = value;
  document.querySelectorAll("[data-credit-balance]").forEach(el => {
    el.textContent = value === null ? "—" : value;
  });
  updateCreditCardCopy(value);
  updateCreditLockState(value);
  updateOffensivaMonetization(value);
  updateFreeBadge();
}

function resetCreditsUI() {
  currentCredits = null;
  document.querySelectorAll("[data-credit-balance]").forEach(el => {
    el.textContent = "1";
  });
  freeRemaining = null;
  loadStoredFreeRemaining();
  updateFreeBadge();
  updateCreditCardCopy(null);
  updateCreditLockState(null);
  updateOffensivaMonetization(null);
}

function setReferralLoading(isLoading) {
  const card = document.getElementById("card-referrals");
  if (!card) return;
  card.classList.toggle("referral-loading", isLoading);
}

function setReferralError(message) {
  const el = document.getElementById("referral-error");
  if (!el) return;
  el.textContent = message || "";
}

function setReferralLink(link) {
  const input = document.getElementById("referral-link");
  if (input) input.value = link || "—";
  currentReferralLink = link || "";
  const disabled = !currentReferralLink;
  const copyBtn = document.querySelector("[data-referral-copy]");
  const waBtn = document.querySelector("[data-referral-whatsapp]");
  if (copyBtn) copyBtn.disabled = disabled;
  if (waBtn) waBtn.disabled = disabled;
}

function setReferralCode(code) {
  document.querySelectorAll("[data-referral-code]").forEach(el => {
    el.textContent = code || "—";
  });
}

function setReferralStats(pending, confirmed, credits) {
  const pendingEl = document.querySelector("[data-referral-pending]");
  const confirmedEl = document.querySelector("[data-referral-confirmed]");
  const creditsEl = document.querySelector("[data-referral-credits]");
  if (pendingEl) pendingEl.textContent = Math.max(0, Math.round(Number(pending) || 0));
  if (confirmedEl) confirmedEl.textContent = Math.max(0, Math.round(Number(confirmed) || 0));
  if (creditsEl) creditsEl.textContent = Math.max(0, Math.round(Number(credits) || 0));
}

function normalizeReferralData(data) {
  if (!data) return { link: "", code: "", pending: 0, confirmed: 0, credits: 0 };
  const link = data.referral_link || data.referralLink || data.link || data?.referral?.link || data?.referral?.referral_link || "";
  const code = data.referral_code || data.code || data?.referral?.code || data?.referral?.referral_code || data?.referral?.ref || "";
  const stats = data.stats || data.referral_stats || data.referrals || data;
  const pending = stats.pending ?? stats.pendentes ?? stats.pending_count ?? stats.pendings ?? 0;
  const confirmed = stats.confirmed ?? stats.confirmadas ?? stats.confirmed_count ?? stats.activated ?? stats.approved ?? 0;
  const credits = stats.total_credits ?? stats.total_creditos ?? stats.credits ?? stats.earned_credits ?? stats.credits_earned ?? 0;
  const fallbackLink = code ? `${window.location.origin}/register?ref=${encodeURIComponent(code)}` : "";
  return {
    link: link || fallbackLink,
    code: code || "",
    pending,
    confirmed,
    credits
  };
}

async function loadReferral() {
  const card = document.getElementById("card-referrals");
  if (!card || !getToken()) return;
  setReferralLoading(true);
  setReferralError("");
  try {
    const res = await fetch(`${API_BASE}/me/referral`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Falha ao carregar");
    const data = await res.json();
    const info = normalizeReferralData(data);
    if (!info.link) throw new Error("Link indisponível");
    setReferralLink(info.link);
    setReferralCode(info.code);
    setReferralStats(info.pending, info.confirmed, info.credits);
  } catch (err) {
    setReferralLink("");
    setReferralCode("");
    setReferralStats(0, 0, 0);
    setReferralError("Não foi possível carregar seu link.");
  } finally {
    setReferralLoading(false);
  }
}

function getReferralShareText(link) {
  return `Tô usando a Mooose pra corrigir redação. Se cadastrar por aqui você ganha bônus: ${link}`;
}

async function copyReferralLink() {
  if (!currentReferralLink) {
    showToast("Link indisponível.", "error");
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(currentReferralLink);
    } else {
      const input = document.getElementById("referral-link");
      if (input) {
        input.select();
        document.execCommand("copy");
      }
    }
    showToast("Link copiado!");
    trackEvent("referral_copy");
  } catch (err) {
    showToast("Não foi possível copiar.", "error");
  }
}

function shareReferralWhatsapp() {
  if (!currentReferralLink) {
    showToast("Link indisponível.", "error");
    return;
  }
  const text = getReferralShareText(currentReferralLink);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  trackEvent("referral_whatsapp_share");
}

function setProgressTo800(value) {
  const score = normalizeScore(value) ?? 0;
  const percent = Math.max(0, Math.min(100, Math.round((score / PROGRESS_TARGET_SCORE) * 100)));
  document.querySelectorAll("[data-progress-percent]").forEach(el => {
    el.textContent = `${percent}%`;
  });
  document.querySelectorAll("[data-progress-fill]").forEach(el => {
    el.style.width = `${percent}%`;
  });
}

function setOffensivaProgressStats(total, best, avg) {
  const totalValue = Math.max(0, Math.round(Number(total) || 0));
  const bestValue = normalizeScore(best) ?? 0;
  const avgValue = normalizeScore(avg) ?? 0;
  document.querySelectorAll("[data-total-essays]").forEach(el => {
    el.textContent = totalValue;
  });
  document.querySelectorAll("[data-best-score]").forEach(el => {
    el.textContent = bestValue ? bestValue.toFixed(0) : "0";
  });
  document.querySelectorAll("[data-avg-score]").forEach(el => {
    el.textContent = avgValue ? avgValue.toFixed(0) : "0";
  });
}

function updateSummaryScores(avg, best) {
  const avgEl = document.querySelector("[data-summary-avg]");
  const bestEl = document.querySelector("[data-summary-best]");
  const avgValue = normalizeScore(avg) ?? 0;
  const bestValue = normalizeScore(best) ?? 0;
  if (avgEl) avgEl.textContent = avgValue ? avgValue.toFixed(0) : "0";
  if (bestEl) bestEl.textContent = bestValue ? bestValue.toFixed(0) : "0";
}

function renderHistoryCharts(items = [], avgScore = null, bestScore = null) {
  const resumo = document.getElementById("evolucao-resumo");
  const resumoApp = document.getElementById("app-evolucao-resumo");
  const avgValue = normalizeScore(avgScore) ?? 0;
  const bestValue = normalizeScore(bestScore) ?? 0;
  const summaryHtml = `
    <div class="evolucao-metric">
       <small>MÉDIA</small>
       <div class="evolucao-value">${avgValue ? avgValue.toFixed(0) : "0"}</div>
    </div>
    <div class="evolucao-divider"></div>
    <div class="evolucao-metric">
       <small>MELHOR</small>
       <div class="evolucao-value best">${bestValue ? bestValue.toFixed(0) : "0"}</div>
    </div>
  `;
  if (resumo) resumo.innerHTML = summaryHtml;
  if (resumoApp) resumoApp.innerHTML = summaryHtml;

  const buildChart = (canvas, instanceRef, labels, values) => {
    if (!canvas || typeof Chart === "undefined" || !labels.length) return instanceRef;
    if (instanceRef) {
      instanceRef.data.labels = labels;
      instanceRef.data.datasets[0].data = values;
      instanceRef.update();
      return instanceRef;
    }
    return new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Nota",
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 1000 } }
      }
    });
  };

  const sorted = items
    .filter(x => typeof x.nota_final === "number")
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const labels = sorted.map(x => new Date(x.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
  const values = sorted.map(x => x.nota_final);

  chartInstance = buildChart(document.getElementById("evolucaoChart"), chartInstance, labels, values);
  appChartInstance = buildChart(document.getElementById("app-evolucaoChart"), appChartInstance, labels, values);
}

function renderAppHistory(items = []) {
  const list = document.getElementById("app-history-list");
  const latest = document.getElementById("app-latest-list");
  if (!list && !latest) return;
  const ordered = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const toItem = (item) => {
    const tema = item.tema || "Sem tema";
    const score = Number(item.nota_final);
    const scoreText = Number.isFinite(score) ? Math.round(score).toString() : "—";
    return `<div class="app-list-item" role="button" tabindex="0" data-essay-id="${item.id}"><span>${tema}</span><strong>${scoreText}</strong></div>`;
  };
  if (list) {
    if (!ordered.length) {
      list.innerHTML = '<span class="app-empty">Sem histórico.</span>';
    } else {
      list.innerHTML = ordered.map(toItem).join("");
    }
  }
  if (latest) {
    if (!ordered.length) {
      latest.innerHTML = '<span class="app-empty">Sem correções ainda.</span>';
    } else {
      latest.innerHTML = ordered.slice(0, 3).map(toItem).join("");
    }
  }
}

function extractHistoryEssayText(item) {
  return (
    item?.texto ||
    item?.texto_ocr ||
    item?.texto_original ||
    item?.redacao ||
    item?.conteudo ||
    item?.transcricao ||
    ""
  );
}

function extractHistoryResult(item) {
  if (item?.resultado) return item.resultado;
  const hasCompetencias = Array.isArray(item?.competencias);
  const hasAnalise = Boolean(item?.analise_geral || item?.feedback_geral || item?.feedback);
  if (hasCompetencias || hasAnalise) return item;
  return null;
}

function renderHistoryModalContent(item) {
  const body = document.getElementById("history-modal-body");
  if (!body) return;
  const essayText = extractHistoryEssayText(item);
  const resultado = extractHistoryResult(item);
  const analysis = resultado?.analise_geral || resultado?.feedback_geral || resultado?.feedback || "";
  const compBlocks = (resultado?.competencias || []).map(c => {
    const feedback = c.feedback || "";
    if (!feedback) return "";
    return `
      <div class="app-feedback-card">
        <div class="app-feedback-head">Competência ${c.id} • ${c.nota} / 200</div>
        <div class="app-feedback-text">${marked.parse(feedback)}</div>
      </div>
    `;
  }).join("");
  const hasCompFeedback = (resultado?.competencias || []).some(c => Boolean(c.feedback));
  const review = item?.review || null;
  body.innerHTML = `
    <div class="history-section">
      <h4>Texto da redação</h4>
      ${essayText ? `<div class="history-essay">${essayText}</div>` : `<div class="history-empty">Texto completo não disponível neste histórico.</div>`}
    </div>
    <div class="history-section history-feedback">
      <h4>Feedback da correção</h4>
      ${analysis || hasCompFeedback
        ? `
          ${analysis ? `<div class="app-feedback-text">${marked.parse(analysis)}</div>` : ""}
          ${compBlocks}
        `
        : `<div class="history-empty">Feedback completo não disponível neste histórico.</div>`}
    </div>
    <div class="history-section hidden" id="history-modal-review">
      <h4>Avalie esta correção</h4>
      <div class="review-widget" data-review-widget data-essay-id="${item?.id || ""}" data-initial-stars="${review?.stars || 0}" data-initial-comment="${encodeAttr(review?.comment || "")}" data-initial-created-at="${encodeAttr(review?.created_at || "")}" data-initial-updated-at="${encodeAttr(review?.updated_at || "")}">
        <div class="review-summary" data-review-summary>
          <span class="review-summary-stars" data-review-summary-stars>Sem avaliação</span>
          <span class="review-badge hidden" data-review-badge></span>
          <button type="button" class="link-btn review-toggle" data-review-toggle>Avaliar</button>
        </div>
        <div class="review-body">
          <div class="review-intro">
            <div class="review-header">Avalie esta correção</div>
            <p class="review-invite">Leva menos de 1 minuto.</p>
          </div>
          <div class="review-row">
            <div class="review-stars" data-review-stars></div>
            <button type="button" class="duo-btn btn-secondary small" data-review-save>Salvar avaliação</button>
          </div>
          <textarea class="review-input" rows="2" placeholder="Comentário (opcional)" data-review-comment></textarea>
          <p class="form-message" data-review-msg></p>
        </div>
      </div>
    </div>
    <div id="history-modal-end" style="height: 1px;"></div>
  `;
}

function openHistoryModal(item) {
  const modal = document.getElementById("history-modal");
  if (!modal || !item) return;
  const titleEl = document.getElementById("history-modal-title");
  const subEl = document.getElementById("history-modal-sub");
  const scoreEl = document.getElementById("history-modal-score");
  const title = item.tema || "Redação";
  const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : "—";
  const score = normalizeScore(item.nota_final);
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = `Enviada em ${date}`;
  if (scoreEl) scoreEl.textContent = score !== null ? Math.round(score).toString() : "—";
  renderHistoryModalContent(item);
  const reviewSection = document.getElementById("history-modal-review");
  if (reviewSection) reviewSection.classList.add("hidden");
  const reviewWidget = reviewSection?.querySelector("[data-review-widget]") || null;
  if (reviewWidget) initReviewWidget(reviewWidget);
  const sentinel = document.getElementById("history-modal-end");
  const card = modal.querySelector(".history-modal-card");
  if (historyEndObserver) historyEndObserver.disconnect();
  if (sentinel && reviewSection && card) {
    historyEndObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) reviewSection.classList.remove("hidden");
      },
      { root: card, threshold: 0.4 }
    );
    historyEndObserver.observe(sentinel);
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeHistoryModal() {
  const modal = document.getElementById("history-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  if (historyEndObserver) historyEndObserver.disconnect();
}

function updateAppResult(res) {
  const scoreEl = document.querySelector("[data-app-score]");
  const listEl = document.querySelector("[data-app-competencias]");
  const feedbackEl = document.querySelector("[data-app-feedback]");
  const emptyEl = document.querySelector("[data-app-result-empty]");
  if (!scoreEl || !listEl) return;
  if (!res) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    scoreEl.textContent = "—";
    listEl.innerHTML = "";
    if (feedbackEl) {
      feedbackEl.innerHTML = "";
      feedbackEl.classList.add("hidden");
    }
    return;
  }
  const score = normalizeScore(res.nota_final);
  scoreEl.textContent = score !== null ? Math.round(score).toString() : "—";
  const comps = (res.competencias || []).map(c => {
    return `<div class="app-result-pill"><span>C${c.id}</span><span>${c.nota} / 200</span></div>`;
  }).join("");
  listEl.innerHTML = comps;
  if (feedbackEl) {
    const analysis = res.analise_geral || res.feedback_geral || res.feedback || "";
    const compBlocks = (res.competencias || []).map(c => {
      const feedback = c.feedback || "";
      if (!feedback) return "";
      return `
        <div class="app-feedback-card">
          <div class="app-feedback-head">Competência ${c.id} • ${c.nota} / 200</div>
          <div class="app-feedback-text">${marked.parse(feedback)}</div>
        </div>
      `;
    }).join("");
    const hasCompFeedback = (res.competencias || []).some(c => Boolean(c.feedback));
    if (analysis || hasCompFeedback) {
      feedbackEl.innerHTML = `
        ${analysis ? `<div class="app-feedback-text">${marked.parse(analysis)}</div>` : ""}
        ${compBlocks}
      `;
      feedbackEl.classList.remove("hidden");
    } else {
      feedbackEl.innerHTML = "";
      feedbackEl.classList.add("hidden");
    }
  }
  if (emptyEl) emptyEl.classList.add("hidden");
}

function resetAppData() {
  renderAppHistory([]);
  updateAppResult(null);
}

function updateOffensivaCTA(credits) {
  const cta = document.getElementById("offensiva-cta");
  if (!cta) return;
  const hasCredits = credits === null || Number(credits) > 0;
  if (hasCredits) {
    cta.textContent = "Enviar redação agora";
    cta.dataset.action = "send";
  } else {
    cta.textContent = "Manter ofensiva (R$ 9,90)";
    cta.dataset.action = "buy";
  }
}

function updateOffensivaMonetization(credits) {
  const show = credits !== null && Number(credits) <= 0;
  document.querySelectorAll("[data-offensiva-monetization]").forEach(el => {
    el.classList.toggle("hidden", !show);
  });
  updateOffensivaCTA(credits);
}

function updateOffensivaMotivation(streak) {
  const titleEl = document.querySelector("[data-offensiva-motivation-title]");
  const textEl = document.querySelector("[data-offensiva-motivation-text]");
  if (!titleEl && !textEl) return;

  let title = "🌱 Você começou bem.";
  let text = "Agora é hora de criar o hábito.";
  if (streak >= 6) {
    title = "🏆 Compromisso de quem quer passar.";
    text = "Poucos chegam até aqui.";
  } else if (streak >= 3) {
    title = "🚀 Você está à frente da maioria.";
    text = "Continue assim.";
  }

  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
}

function updateOffensivaStatus(status, deadlineLabel) {
  const titleEl = document.querySelector("[data-offensiva-status-title]");
  const subEl = document.querySelector("[data-offensiva-status-sub]");
  if (!titleEl && !subEl) return;

  let title = "😕 Sua ofensiva foi interrompida.";
  let sub = "Mas você pode recomeçar hoje. Toda aprovação começa com constância.";

  if (status === "active") {
    title = "💪 Você está em ritmo de treino!";
    sub = "Continue enviando pelo menos uma redação por semana para manter sua ofensiva.";
  } else if (status === "warning") {
    title = "⚠️ Não perca sua ofensiva!";
    const label = deadlineLabel || "domingo";
    sub = `Envie uma redação até ${label} para continuar no ritmo.`;
  }

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
}

function showOffensivaModal() {
  const modal = document.getElementById("offensiva-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  updateOffensivaMonetization(currentCredits);
  const card = modal.querySelector(".offensiva-modal-card");
  if (card) card.focus();
}

function hideOffensivaModal() {
  const modal = document.getElementById("offensiva-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function focusAppCorrection() {
  showSection("section-landing");
  renderAppView("new");
  requestAnimationFrame(() => {
    const activePanel = document.querySelector("[data-app-panel].active");
    const input =
      activePanel?.querySelector('input[name="tema_app_file"], input[name="tema_app"]') ||
      document.querySelector('input[name="tema_app_file"], input[name="tema_app"]');
    if (input) input.focus();
  });
}

function getWeekStart(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function getISOWeekKey(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function computeWeeklyStreak(items = []) {
  const weekSet = new Set();
  items.forEach(item => {
    const raw = item?.created_at || item?.createdAt || item?.date;
    const key = getISOWeekKey(raw);
    if (key) weekSet.add(key);
  });

  const today = new Date();
  const currentWeekKey = getISOWeekKey(today);
  const currentWeekStart = getWeekStart(today);
  const dayIndex = (today.getDay() + 6) % 7;
  const daysLeftInWeek = 6 - dayIndex;
  const hasDoneThisWeek = currentWeekKey ? weekSet.has(currentWeekKey) : false;

  let streak = 0;
  if (currentWeekStart && currentWeekKey) {
    let cursor = hasDoneThisWeek
      ? new Date(currentWeekStart.getTime())
      : new Date(currentWeekStart.getTime() - WEEK_IN_MS);
    while (cursor && weekSet.has(getISOWeekKey(cursor))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - WEEK_IN_MS);
    }
  }

  const lastWeeksStatus = [];
  if (currentWeekStart && currentWeekKey) {
    const labels = ["Sem 1", "Sem 2", "Sem 3", "Esta semana"];
    for (let i = 3; i >= 1; i--) {
      const start = new Date(currentWeekStart.getTime() - i * WEEK_IN_MS);
      lastWeeksStatus.push({ label: labels[3 - i], done: weekSet.has(getISOWeekKey(start)) });
    }
    lastWeeksStatus.push({ label: labels[3], done: hasDoneThisWeek });
  } else {
    ["Sem 1", "Sem 2", "Sem 3", "Esta semana"].forEach(label => {
      lastWeeksStatus.push({ label, done: false });
    });
  }

  return { streak, hasDoneThisWeek, daysLeftInWeek, lastWeeksStatus };
}

function updateWeeklyStreak(items = []) {
  const streakEls = document.querySelectorAll("[data-week-streak]");
  const streakLabelEls = document.querySelectorAll("[data-week-streak-label]");
  const summaryEl = document.querySelector("[data-week-summary]");
  const miniEl = document.querySelector("[data-offensiva-mini]");
  const miniValueEls = document.querySelectorAll("[data-week-streak-mini]");
  const lineValueEls = document.querySelectorAll("[data-week-streak-line]");
  const weeksEls = document.querySelectorAll("[data-offensiva-weeks], [data-week-list]");
  const messageEl = document.querySelector("[data-offensiva-message]");
  if (
    !streakEls.length &&
    !streakLabelEls.length &&
    !summaryEl &&
    !miniEl &&
    !miniValueEls.length &&
    !lineValueEls.length &&
    !weeksEls.length &&
    !messageEl
  ) {
    return;
  }

  const { streak, hasDoneThisWeek, lastWeeksStatus } = computeWeeklyStreak(items);

  streakEls.forEach(el => {
    el.textContent = String(streak);
  });

  streakLabelEls.forEach(el => {
    el.textContent = streak === 1 ? "semana" : "semanas";
  });

  miniValueEls.forEach(el => {
    el.textContent = String(streak);
  });
  if (miniEl) {
    miniEl.classList.toggle("hidden", streak === 0);
    const label = `Ofensiva: ${streak} semanas seguidas`;
    miniEl.setAttribute("aria-label", label);
    miniEl.setAttribute("title", label);
  }

  lineValueEls.forEach(el => {
    el.textContent = String(streak);
  });

  if (summaryEl) {
    summaryEl.textContent = hasDoneThisWeek ? "Você treinou esta semana." : "Você treinou esta semana?";
  }

  if (messageEl) {
    messageEl.textContent = hasDoneThisWeek
      ? "Você está mantendo constância. Continue assim."
      : "⚠️ Envie uma redação até domingo para não perder sua ofensiva.";
  }

  if (weeksEls.length) {
    const chips = lastWeeksStatus.map(week => {
      const icon = week.done ? "✓" : "•";
      const statusClass = week.done ? "done" : "";
      return `<div class="offensiva-week-chip ${statusClass}"><span class="offensiva-week-icon">${icon}</span><span>${week.label}</span></div>`;
    }).join("");
    weeksEls.forEach(el => {
      el.innerHTML = chips;
    });
  }
}

function getShareElements() {
  return {
    card: document.getElementById("share-card"),
    img: document.getElementById("share-image-preview"),
    btnNative: document.getElementById("btn-share-native"),
    btnDownload: document.getElementById("btn-share-download"),
    btnWhatsapp: document.getElementById("btn-share-whatsapp"),
    msg: document.getElementById("share-msg")
  };
}

function formatScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toString();
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function buildShareImage(scoreText, temaText = "") {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#dbeafe");
  gradient.addColorStop(0.5, "#eff6ff");
  gradient.addColorStop(1, "#fef9c3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = `rgba(59, 130, 246, ${0.15 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height * 0.6, 8 + Math.random() * 16, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(250, 204, 21, ${0.4 + Math.random() * 0.3})`;
    ctx.lineWidth = 3;
    const x = Math.random() * width;
    const y = Math.random() * height * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 30, y + 20);
    ctx.lineTo(x + 8, y + 40);
    ctx.stroke();
  }

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, width, 140);

  ctx.textAlign = "center";
  ctx.font = "bold 64px Montserrat, sans-serif";
  ctx.fillStyle = "#0b2f8a";
  ctx.fillText("M", width / 2 - 140, 90);
  ctx.fillStyle = "#93c5fd";
  ctx.fillText("O", width / 2 - 70, 90);
  ctx.fillText("O", width / 2, 90);
  ctx.fillText("O", width / 2 + 70, 90);
  ctx.fillStyle = "#0b2f8a";
  ctx.fillText("SE", width / 2 + 150, 90);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(90, 220, width - 180, 1200);
  ctx.strokeStyle = "#bfdbfe";
  ctx.lineWidth = 6;
  ctx.strokeRect(90, 220, width - 180, 1200);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 60px Montserrat, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Minha nota na Mooose", width / 2, 360);

  ctx.fillStyle = "#2563eb";
  ctx.font = "900 180px Montserrat, sans-serif";
  ctx.fillText(scoreText, width / 2, 610);

  ctx.fillStyle = "#475569";
  ctx.font = "500 44px Nunito, sans-serif";
  ctx.fillText("Treinei redação com IA", width / 2, 710);

  if (temaText) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 36px Nunito, sans-serif";
    const maxWidth = 820;
    const lines = [];
    const words = temaText.split(" ");
    let current = "";
    words.forEach(word => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    const startY = 760;
    lines.slice(0, 2).forEach((line, idx) => {
      ctx.fillText(line, width / 2, startY + idx * 44);
    });
  }

  try {
    const mascot = await loadImage("nossa-missao.png");
    const mascotSize = 240;
    ctx.drawImage(mascot, width / 2 - mascotSize / 2, 900, mascotSize, mascotSize);
  } catch (err) {
    // segue sem logo se falhar
  }

  ctx.fillStyle = "#1d4ed8";
  ctx.font = "700 42px Montserrat, sans-serif";
  ctx.fillText("www.mooose.com.br", width / 2, 1180);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Montserrat, sans-serif";
  ctx.fillText("Bora chegar no 1000?", width / 2, 1280);

  return canvas.toDataURL("image/png");
}

async function updateShareCard(result) {
  const els = getShareElements();
  if (!els.card) return;
  const score = Number(result?.nota_final);
  if (!Number.isFinite(score) || score <= 700) {
    els.card.classList.add("hidden");
    return;
  }

  const scoreText = formatScore(score);
  const tema = (result?.tema || lastTema || "").trim();
  els.card.classList.remove("hidden");
  els.msg.textContent = "";

  try {
    const dataUrl = await buildShareImage(scoreText, tema);
    els.img.src = dataUrl;
    els.btnDownload.href = dataUrl;

    const shareText = `Tirei ${scoreText} na redação com a Mooose! Confira em https://www.mooose.com.br`;
    els.btnWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    els.btnNative.onclick = async () => {
      const file = await (await fetch(dataUrl)).blob();
      const shareData = {
        title: "Minha nota na Mooose",
        text: shareText,
        files: [new File([file], "mooose-nota.png", { type: "image/png" })]
      };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        await navigator.share({ title: "Minha nota na Mooose", text: shareText, url: "https://www.mooose.com.br" });
      } else {
        els.msg.textContent = "Seu navegador não suporta compartilhamento direto. Baixe a imagem ou use o WhatsApp.";
        els.msg.className = "form-message";
      }
    };
  } catch (err) {
    els.msg.textContent = "Não foi possível gerar a imagem agora. Tente novamente.";
    els.msg.className = "form-message error";
  }
}

function shouldShowPaywallAfterFree(prevCredits, nextCredits) {
  if (nextCredits === null || Number(nextCredits) !== 0) return false;
  if (prevCredits !== null && Number(prevCredits) <= 0) return false;
  if (paywallShownInSession) return false;
  try {
    if (localStorage.getItem(PAYWALL_STORAGE_KEY) === "1") return false;
  } catch (err) {
    // ignore storage errors
  }
  return true;
}

function markPaywallShown() {
  paywallShownInSession = true;
  try {
    localStorage.setItem(PAYWALL_STORAGE_KEY, "1");
  } catch (err) {
    // ignore storage errors
  }
}

function setPaywallCorrections(value) {
  if (value === null || value === undefined) return;
  const normalized = Math.max(0, Math.round(Number(value) || 0));
  document.querySelectorAll("[data-paywall-corrections]").forEach(el => {
    el.textContent = normalized;
  });
}

function showCreditsModal(options = {}) {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  if (options.markShown) markPaywallShown();
}

function hideCreditsModal() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function showAuthGate() {
  const modal = document.getElementById("auth-gate");
  if (!modal) return;
  modal.classList.remove("hidden");
}

function hideAuthGate() {
  const modal = document.getElementById("auth-gate");
  if (!modal) return;
  modal.classList.add("hidden");
}

function showPostResultAuthNudge() {
  const banner = document.querySelector("[data-post-result-auth]");
  if (!banner) return;
  banner.classList.remove("hidden");
}

function hidePostResultAuthNudge() {
  const banner = document.querySelector("[data-post-result-auth]");
  if (!banner) return;
  banner.classList.add("hidden");
}

function showReviewPopup() {
  if (reviewPopupShown) return;
  const modal = document.getElementById("review-modal");
  if (!modal) return;
  reviewPopupShown = true;
  modal.classList.remove("hidden");
}

function hideReviewPopup() {
  const modal = document.getElementById("review-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function setupReviewPopup(result) {
  if (!result || !lastEssayId) return;
  const existingStars = result?.review?.stars || lastReview?.stars || 0;
  if (existingStars > 0) return;

  reviewPopupShown = false;
  if (reviewPopupTimer) clearTimeout(reviewPopupTimer);
  if (reviewPopupObserver) reviewPopupObserver.disconnect();

  const widget = document.getElementById("review-modal-widget");
  if (widget) {
    widget.dataset.essayId = lastEssayId;
    widget.dataset.initialStars = 0;
    widget.dataset.initialComment = "";
    initReviewWidget(widget);
  }

  reviewPopupTimer = setTimeout(() => {
    showReviewPopup();
  }, 10000);

  const sentinel = document.getElementById("resultado-end-sentinel");
  if (sentinel && "IntersectionObserver" in window) {
    reviewPopupObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        showReviewPopup();
        if (reviewPopupTimer) clearTimeout(reviewPopupTimer);
        reviewPopupObserver.disconnect();
      }
    }, { threshold: 0.6 });
    reviewPopupObserver.observe(sentinel);
  }
}

function encodeAttr(value) {
  return encodeURIComponent(value ?? "");
}

function decodeAttr(value) {
  try { return value ? decodeURIComponent(value) : ""; } catch { return value || ""; }
}

function formatReviewDate(review) {
  const raw = review?.updated_at || review?.created_at || "";
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function starText(value) {
  const filled = Math.min(5, Math.max(0, Number(value) || 0));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function renderStars(container, starsValue = 0) {
  if (!container) return;
  const value = Math.min(5, Math.max(0, Number(starsValue) || 0));
  container.dataset.value = value;
  container.innerHTML = Array.from({ length: 5 }, (_, idx) => {
    const star = idx + 1;
    const active = star <= value ? "active" : "";
    return `<button type="button" class="star-btn ${active}" data-star="${star}" aria-label="${star} estrela${star > 1 ? "s" : ""}">★</button>`;
  }).join("");
}

function initReviewWidget(widget) {
  if (!widget) return;
  widget.classList.remove("open");
  const stars = Number(widget.dataset.initialStars || 0);
  const comment = decodeAttr(widget.dataset.initialComment || "");
  const createdAt = decodeAttr(widget.dataset.initialCreatedAt || "");
  const updatedAt = decodeAttr(widget.dataset.initialUpdatedAt || "");
  renderStars(widget.querySelector("[data-review-stars]"), stars);
  const commentEl = widget.querySelector("[data-review-comment]");
  if (commentEl) commentEl.value = comment;
  updateReviewSummary(widget, {
    stars,
    comment,
    created_at: createdAt || null,
    updated_at: updatedAt || null
  });
  setReviewToggleLabel(widget, widget.classList.contains("open"));
}

function hydrateReviewWidgets(root = document) {
  root.querySelectorAll("[data-review-widget]").forEach(initReviewWidget);
}

function setReviewToggleLabel(widget, isOpen) {
  const toggle = widget?.querySelector("[data-review-toggle]");
  if (!toggle) return;
  if (isOpen) {
    toggle.textContent = "Fechar";
    return;
  }
  const hasReview = Number(widget.dataset.initialStars || 0) > 0;
  toggle.textContent = hasReview ? "Editar avaliação" : "Avaliar";
}

function updateReviewSummary(widget, review) {
  if (!widget) return;
  const summaryStars = widget.querySelector("[data-review-summary-stars]");
  const badge = widget.querySelector("[data-review-badge]");
  const hasReview = Number(review?.stars || 0) > 0;
  widget.classList.toggle("has-review", hasReview);
  if (summaryStars) {
    summaryStars.textContent = hasReview
      ? `${starText(review.stars)} (${review.stars}/5)`
      : "Sem avaliação";
  }
  if (badge) {
    const dateLabel = formatReviewDate(review);
    if (dateLabel) {
      badge.textContent = `Avaliado em ${dateLabel}`;
      badge.classList.remove("hidden");
    } else {
      badge.textContent = "";
      badge.classList.add("hidden");
    }
  }
}

function updateResultadoReview(essayId, review) {
  const widget = document.getElementById("resultado-review");
  if (!widget) return;
  if (!essayId) {
    widget.classList.add("hidden");
    return;
  }
  widget.classList.remove("hidden");
  widget.dataset.essayId = essayId;
  widget.dataset.initialStars = review?.stars || 0;
  widget.dataset.initialComment = encodeAttr(review?.comment || "");
  widget.dataset.initialCreatedAt = encodeAttr(review?.created_at || "");
  widget.dataset.initialUpdatedAt = encodeAttr(review?.updated_at || "");
  initReviewWidget(widget);
}

async function submitReview(widget) {
  if (!widget) return;
  const msgEl = widget.querySelector("[data-review-msg]");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "form-message";
  }
  const essayId = Number(widget.dataset.essayId || widget.closest("[data-essay-id]")?.dataset.essayId);
  const stars = Number(widget.querySelector("[data-review-stars]")?.dataset.value || 0);
  const comment = widget.querySelector("[data-review-comment]")?.value?.trim() || "";

  if (!essayId) {
    if (msgEl) {
      msgEl.textContent = "Não foi possível identificar a redação.";
      msgEl.className = "form-message error";
    }
    return;
  }
  if (!stars || stars < 1 || stars > 5) {
    if (msgEl) {
      msgEl.textContent = "Selecione de 1 a 5 estrelas.";
      msgEl.className = "form-message error";
    }
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/app/enem/avaliar`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ essay_id: essayId, stars, comment: comment || undefined })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverMsg = data?.detail || data?.message || "Falha ao salvar avaliação.";
      throw new Error(serverMsg);
    }
    widget.dataset.initialStars = data.stars || stars;
    widget.dataset.initialComment = encodeAttr(data.comment || comment || "");
    if (data?.created_at || data?.updated_at) {
      widget.dataset.initialCreatedAt = encodeAttr(data.created_at || "");
      widget.dataset.initialUpdatedAt = encodeAttr(data.updated_at || "");
    }
    updateReviewSummary(widget, {
      stars: Number(widget.dataset.initialStars || stars),
      comment: decodeAttr(widget.dataset.initialComment || ""),
      created_at: decodeAttr(widget.dataset.initialCreatedAt || ""),
      updated_at: decodeAttr(widget.dataset.initialUpdatedAt || "")
    });
    widget.classList.remove("open");
    setReviewToggleLabel(widget, false);
    if (msgEl) {
      msgEl.textContent = "Avaliação salva!";
      msgEl.className = "form-message success";
    }
    if (widget.id === "review-modal-widget") {
      hideReviewPopup();
    }
  } catch (err) {
    if (msgEl) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
    }
  }
}

function normalizePlanSlug(plan) {
  const allowed = ["individual", "padrao", "intensivao"];
  if (allowed.includes(plan)) return plan;
  return "padrao";
}

function setCheckoutButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent.trim();
    }
    button.textContent = "Carregando...";
    button.disabled = true;
    button.classList.add("is-disabled");
    button.setAttribute("aria-busy", "true");
  } else {
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
    button.disabled = false;
    button.classList.remove("is-disabled");
    button.removeAttribute("aria-busy");
  }
}

function showCheckoutError() {
  if (typeof showToast === "function") {
    showToast("Não foi possível iniciar o pagamento. Tente novamente.", "error");
  } else {
    alert("Não foi possível iniciar o pagamento. Tente novamente.");
  }
}

async function startCheckout(plan = "padrao", triggerButton) {
  if (!getToken()) {
    pendingNextRoute = PAYWALL_ROUTE;
    setAuthReturnPath(PAYWALL_ROUTE);
    if (typeof window.goToAuth === "function") {
      window.goToAuth("login");
    } else {
      showSection("section-auth");
    }
    return;
  }
  if (checkoutInProgress) return;
  checkoutInProgress = true;
  setCheckoutButtonLoading(triggerButton, true);
  showLoading("Abrindo checkout...");
  try {
    const planSlug = normalizePlanSlug(plan);
    const res = await fetch(`${API_BASE}/payments/create/${planSlug}`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || data?.message || "Falha ao iniciar o pagamento.");
    }
    if (!data?.checkout_url) {
      throw new Error("Checkout indisponível.");
    }
    window.location.href = data.checkout_url;
  } catch (err) {
    showCheckoutError();
  } finally {
    checkoutInProgress = false;
    setCheckoutButtonLoading(triggerButton, false);
    hideLoading();
  }
}

async function linkAnonSession() {
  if (!getToken()) return;
  try {
    await fetch(`${API_BASE}/auth/link-anon`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ anon_id: getAnonId() })
    });
  } catch (err) {
    // ignore link errors
  }
}

function resolveAuthReturnPath() {
  if (pendingNextRoute) return pendingNextRoute;
  if (isPaywallRoute()) return PAYWALL_ROUTE;
  if (isEditorRoute()) return EDITOR_ROUTE;
  if (freeRemaining === 0 && currentCredits !== null && Number(currentCredits) <= 0) {
    return PAYWALL_ROUTE;
  }
  return EDITOR_ROUTE;
}

function handlePostAuthRedirect() {
  const stored = consumeAuthReturnPath();
  const next = stored || resolveAuthReturnPath();
  pendingNextRoute = "";
  if (next === PAYWALL_ROUTE) {
    openPaywallView({ replace: true });
  } else if (next === EDITOR_ROUTE) {
    openEditorView({ replace: true });
  }
}

function startGoogleAuth() {
  setAuthReturnPath(resolveAuthReturnPath());
  window.location.href = `${API_BASE}/auth/google/start`;
}

function openEmailAuth() {
  setAuthReturnPath(resolveAuthReturnPath());
  hideAuthGate();
  if (typeof window.goToAuth === "function") {
    window.goToAuth("register");
  } else {
    showSection("section-auth");
  }
}

async function fetchMe(options = {}) {
  const { allowCookie = false, preserveToken = false } = options;
  const t = getToken();
  if (!t && !allowCookie) return;
  try {
    const headers = t ? getAuthHeaders() : { "X-ANON-ID": getAnonId() };
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers,
      credentials: allowCookie ? "include" : "same-origin"
    });
    if (!res.ok) throw new Error("Sessão inválida");
    const data = await res.json();
    if (!t) {
      const newToken = data?.access_token || data?.token || data?.accessToken;
      if (newToken) setToken(newToken);
    }

    const emailEl = document.getElementById("user-email");
    if (emailEl) emailEl.textContent = `${data.full_name || "Usuário"} (${data.email})`;
    
    updateTopbarUser(data);
    const credits = extractCredits(data);
    setCreditsUI(credits);
    const freeLeft = extractFreeRemaining(data);
    if (freeLeft !== null) updateFreeRemaining(freeLeft);
    if (shouldUseAppShell()) {
      showSection("section-landing");
    } else {
      showSection("section-dashboard");
    }
    if (loadHistoricoFn) loadHistoricoFn();
    loadReferral();
    if (peekAuthReturnPath() || pendingNextRoute) {
      handlePostAuthRedirect();
    }
  } catch(e) {
    if (preserveToken) {
      if (getToken()) {
        updateTopbarUser({});
        if (shouldUseAppShell()) {
          showSection("section-landing");
        }
      } else {
        updateTopbarUser(null);
      }
      return;
    }
    setToken(null);
    updateTopbarUser(null);
    resetCreditsUI();
    resetAppData();
    showSection("section-landing"); // ou auth
  }
}

async function handleConfirmRoute() {
  showSection("section-confirm");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || params.get("access_token");
  const next = params.get("next");
  if (token) {
    setToken(token);
  }
  await linkAnonSession();
  if (token) {
    await fetchMe({ allowCookie: true, preserveToken: true });
  } else {
    await fetchMe({ allowCookie: true, preserveToken: true });
  }
  const target = next || consumeAuthReturnPath() || resolveAuthReturnPath();
  if (target === PAYWALL_ROUTE) {
    openPaywallView({ replace: true });
  } else {
    openEditorView({ replace: true });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const btnNavLogin = document.getElementById("btn-nav-login");
  const btnNavRegister = document.getElementById("btn-nav-register");
  const btnCtaStart = document.getElementById("btn-cta-start");
  const btnCtaLogin = document.getElementById("btn-cta-login");
  const btnPromoStart = document.getElementById("btn-promo-start");
  const btnLogout = document.getElementById("btn-logout");
  const offensivaCta = document.getElementById("offensiva-cta");

  // Auth switchers
  const cardLogin = document.getElementById("card-login");
  const cardRegister = document.getElementById("card-register");
  const cardForgot = document.getElementById("card-forgot-password");

  const btnGoRegister = document.getElementById("btn-go-register");
  const btnReturnLogin = document.getElementById("btn-return-to-login");
  const btnGoForgot = document.getElementById("btn-go-forgot-password");
  const btnBackFromForgot = document.getElementById("btn-back-from-forgot");

  // Forms
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const formForgot = document.getElementById("form-forgot-password");
  const formCorrigir = document.getElementById("form-corrigir");
  const formCorrigirArquivo = document.getElementById("form-corrigir-arquivo");
  const formAppText = document.getElementById("form-app-text");
  const formAppFile = document.getElementById("form-app-file");

  const msgLogin = document.getElementById("msg-login");
  const msgRegister = document.getElementById("msg-register");
  const msgForgot = document.getElementById("msg-forgot");
  const msgCorrigir = document.getElementById("msg-corrigir");
  const msgCorrigirArquivo = document.getElementById("msg-corrigir-arquivo");
  const msgAppText = document.getElementById("msg-app-text");
  const msgAppFile = document.getElementById("msg-app-file");
  const appTextArea = document.getElementById("app-textarea");
  const appLoginBtn = document.getElementById("btn-app-login");
  const appLogoutBtn = document.getElementById("btn-app-logout");
  updateAppHeaderHeight();
  window.addEventListener("resize", updateAppHeaderHeight);
  loadPublicCorrectionsCount();
  loadStoredFreeRemaining();
  updateTopbarUser(getToken() ? {} : null);

  updateTopbarUser = (data) => {
    const navAuth = document.getElementById("nav-auth");
    const topbarSecondary = document.querySelector(".topbar-secondary");
    const greetingEl = document.querySelector("[data-greeting]");
    const firstName = data?.full_name?.split(" ")[0];

    if (data) {
      navAuth?.classList.add("hidden");
      if (appLoginBtn) appLoginBtn.classList.add("hidden");
      if (appLogoutBtn) appLogoutBtn.classList.remove("hidden");
      if (topbarSecondary) topbarSecondary.classList.remove("hidden");
      if (greetingEl) greetingEl.textContent = `E aí ${firstName || "Aluno"}, pronto para corrigir?`;
      hidePostResultAuthNudge();
    } else {
      navAuth?.classList.remove("hidden");
      if (appLoginBtn) appLoginBtn.classList.remove("hidden");
      if (appLogoutBtn) appLogoutBtn.classList.add("hidden");
      if (topbarSecondary) topbarSecondary.classList.add("hidden");
      if (greetingEl) greetingEl.textContent = "e aí, pronto para corrigir?";
    }
    requestAnimationFrame(updateAppHeaderHeight);
  };

  const viewEls = document.querySelectorAll("[data-view]");
  const viewTriggers = document.querySelectorAll("[data-view-target]");
  const appTabs = document.querySelectorAll(".app-bottom-bar .app-tab");

  renderAppView = (view) => {
    if (!viewEls.length) return;
    const available = Array.from(viewEls).map(el => el.dataset.view);
    const target = available.includes(view) ? view : "home";
    currentAppView = target;
    viewEls.forEach(el => {
      el.classList.toggle("active", el.dataset.view === target);
    });
    appTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.viewTarget === target);
    });
    if (target === "new") {
      updateFreeBadge();
    }
  };

  viewTriggers.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.dataset.viewTarget;
      if (target) renderAppView(target);
    });
  });

  const appTabButtons = document.querySelectorAll("[data-app-tab]");
  const appPanels = document.querySelectorAll("[data-app-panel]");
  appTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.appTab;
      if (!target) return;
      appTabButtons.forEach(tab => tab.classList.toggle("active", tab === btn));
      appPanels.forEach(panel => panel.classList.toggle("active", panel.dataset.appPanel === target));
    });
  });

  if (appTextArea) {
    const countEl = document.querySelector("[data-char-count]");
    const updateCount = () => {
      const length = appTextArea.value.length;
      if (countEl) countEl.textContent = `${length}`;
    };
    appTextArea.addEventListener("input", updateCount);
    updateCount();
  }

  restoreDrafts();
  const appTemaInput = document.querySelector("input[name='tema_app']");
  const appTemaFileInput = document.querySelector("input[name='tema_app_file']");
  if (appTextArea) {
    appTextArea.addEventListener("input", () => {
      saveDraftText(appTextArea.value, appTemaInput?.value || "");
    });
  }
  appTemaInput?.addEventListener("input", () => {
    saveDraftText(appTextArea?.value || "", appTemaInput.value);
  });
  appTemaFileInput?.addEventListener("input", () => {
    saveDraftFileTema(appTemaFileInput.value);
  });

  const applyAppTheme = () => {
    const inputs = document.querySelectorAll('input[name="tema_app"], input[name="tema_app_file"]');
    inputs.forEach(input => {
      input.value = WEEK_THEME_TEXT;
    });
    const activePanel = document.querySelector("[data-app-panel].active");
    const activeInput =
      activePanel?.querySelector('input[name="tema_app"], input[name="tema_app_file"]') || inputs[0];
    if (activeInput) {
      activeInput.focus();
    }
  };

  document.querySelectorAll("[data-app-use-theme]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      renderAppView("new");
      applyAppTheme();
    });
  });

  const creditsSheet = document.getElementById("credits-sheet");
  const showCreditsSheet = () => creditsSheet?.classList.remove("hidden");
  const hideCreditsSheet = () => creditsSheet?.classList.add("hidden");
  document.querySelectorAll("[data-credits-open]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showCreditsSheet();
    });
  });
  document.querySelectorAll("[data-credits-sheet-close]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      hideCreditsSheet();
    });
  });

  function goToAuth(mode='login') {
    const authSection = document.getElementById("section-auth");
    if (!authSection) {
      const param = mode === "login" ? "login=1" : "signup=1";
      window.location.href = `/?${param}`;
      return;
    }
    showSection("section-auth");
    cardLogin.classList.remove("hidden");
    cardRegister.classList.add("hidden");
    cardForgot.classList.add("hidden");
    if(mode==='register') {
      cardLogin.classList.add("hidden");
      cardRegister.classList.remove("hidden");
    }
  }
  window.goToAuth = goToAuth;

  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash ? window.location.hash.slice(1) : "");
  const urlRef = (urlParams.get("ref") || "").trim();
  const startParam = (urlParams.get("start") || "").trim();
  const loginParam = (urlParams.get("login") || "").trim();
  const signupParam = (urlParams.get("signup") || "").trim();
  const editorParam = (urlParams.get("editor") || "").trim();
  const paywallParam = (urlParams.get("paywall") || "").trim();
  const confirmParam = (urlParams.get("confirm") || "").trim();
  const tokenParam = (urlParams.get("token") || urlParams.get("access_token") || hashParams.get("token") || hashParams.get("access_token") || "").trim();
  if (isConfirmRoute() || confirmParam === "1") {
    handleConfirmRoute();
    return;
  }
  if (tokenParam && (isEditorRoute() || isPaywallRoute())) {
    handleConfirmRoute();
    return;
  }
  const wantsEditor = editorParam === "1" || startParam === "1" || isEditorRoute();
  const wantsPaywall = paywallParam === "1" || isPaywallRoute();
  const storedRef = getStoredReferralCode();
  if (urlRef) {
    applyReferralCode(urlRef);
  } else if (storedRef) {
    applyReferralCode(storedRef);
  }
  if (!getToken()) {
    let shouldShowLanding = true;
    if (loginParam) {
      goToAuth("login");
      shouldShowLanding = false;
    } else if (urlRef || signupParam || window.location.pathname.includes("/register")) {
      goToAuth("register");
      shouldShowLanding = false;
    } else if (wantsEditor) {
      openEditorView({ replace: true });
      shouldShowLanding = false;
    } else if (wantsPaywall) {
      openPaywallView({ replace: true });
      shouldShowLanding = false;
    }
    if (shouldShowLanding && document.getElementById("section-landing")) {
      showSection("section-landing");
    }
  } else if (wantsEditor || wantsPaywall) {
    pendingNextRoute = wantsPaywall ? PAYWALL_ROUTE : EDITOR_ROUTE;
  }
  if (document.getElementById("section-landing")?.classList.contains("visible")) {
    setLandingMode();
    const shouldShell = shouldShowAppShell();
    document.body.classList.toggle("app-shell", shouldShell);
    document.getElementById("app-bottom-bar")?.classList.toggle("hidden", !shouldShell);
    updateFreeBadge();
  }

  const openBuyView = () => {
    if (!getToken()) {
      pendingNextRoute = PAYWALL_ROUTE;
      showAuthGate();
      return;
    }
    openPaywallView();
  };

  document.querySelectorAll("[data-buy-credits]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openBuyView();
    });
  });

  document.querySelectorAll("[data-buy-plan]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      startCheckout(btn.dataset.buyPlan, btn);
    });
  });

  document.querySelectorAll("[data-credits-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      hideCreditsModal();
    });
  });

  document.querySelectorAll("[data-review-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      hideReviewPopup();
    });
  });

  document.querySelectorAll("[data-auth-google]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      startGoogleAuth();
    });
  });

  document.querySelectorAll("[data-auth-email]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openEmailAuth();
    });
  });

  document.querySelectorAll("[data-auth-gate-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      hideAuthGate();
    });
  });

  document.querySelectorAll("[data-referral-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyReferralCode("");
    });
  });

  const referralCopyBtn = document.querySelector("[data-referral-copy]");
  const referralWhatsappBtn = document.querySelector("[data-referral-whatsapp]");
  referralCopyBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    copyReferralLink();
  });
  referralWhatsappBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    shareReferralWhatsapp();
  });

  document.querySelectorAll("[data-offensiva-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      showOffensivaModal();
    });
  });

  document.querySelectorAll("[data-offensiva-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      hideOffensivaModal();
    });
  });

  document.querySelectorAll("[data-theme-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.themeTarget;
      const value = (btn.dataset.themeValue || btn.textContent || "").trim();
      if (!target || !value) return;
      if (target === "all") {
        ["tema", "tema_arquivo"].forEach(name => {
          const input = document.querySelector(`[name="${name}"]`);
          if (input) input.value = value;
        });
      } else {
        const input = document.querySelector(`[name="${target}"]`);
        if (input) input.value = value;
      }
      const activePanel = document.querySelector(".correction-panel.active");
      const activeInput = activePanel?.querySelector('input[name="tema"], input[name="tema_arquivo"]');
      if (activeInput) activeInput.focus();
      const scrollTarget = btn.dataset.scrollTarget;
      if (scrollTarget === "correcao") {
        const card = document.getElementById("card-nova-correcao");
        if (card) card.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  document.querySelectorAll("[data-send-btn]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!btn.classList.contains("is-disabled")) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNextRoute = PAYWALL_ROUTE;
      openPaywallView();
    });
  });

  offensivaCta?.addEventListener("click", (e) => {
    e.preventDefault();
    const action = offensivaCta.dataset.action || "send";
    if (action === "buy") {
      startCheckout("padrao", offensivaCta);
      return;
    }
    hideOffensivaModal();
    const dashboardVisible = document.getElementById("section-dashboard")?.classList.contains("visible");
    if (dashboardVisible) {
      const target = document.getElementById("card-nova-correcao");
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    focusAppCorrection();
  });

  document.querySelectorAll("[data-weekly-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".weekly-theme-card");
      if (!card) return;
      const extra = card.querySelector(".weekly-extra");
      if (!extra) return;
      extra.classList.toggle("hidden");
      btn.textContent = extra.classList.contains("hidden") ? "Ver textos de apoio" : "Fechar textos de apoio";
    });
  });

  const btnGoCorrection = document.getElementById("btn-go-correction");
  if (btnGoCorrection) {
    btnGoCorrection.addEventListener("click", () => {
      const target = document.getElementById("card-nova-correcao");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  }

  const openHistoryById = (essayId) => {
    if (!essayId) return;
    const item = historyCache.get(String(essayId));
    if (item) openHistoryModal(item);
  };

  const handleHistoryActivate = (event) => {
    if (event.target.closest(".review-widget")) return;
    const itemEl = event.target.closest("[data-essay-id]");
    if (!itemEl) return;
    openHistoryById(itemEl.dataset.essayId);
  };

  const handleHistoryKeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const itemEl = event.target.closest("[data-essay-id]");
    if (!itemEl) return;
    event.preventDefault();
    openHistoryById(itemEl.dataset.essayId);
  };

  document.getElementById("historico-list")?.addEventListener("click", handleHistoryActivate);
  document.getElementById("historico-list")?.addEventListener("keydown", handleHistoryKeydown);
  document.getElementById("app-history-list")?.addEventListener("click", handleHistoryActivate);
  document.getElementById("app-history-list")?.addEventListener("keydown", handleHistoryKeydown);

  document.querySelectorAll("[data-history-close]").forEach(btn => {
    btn.addEventListener("click", closeHistoryModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideCreditsModal();
    if (e.key === "Escape") hideReviewPopup();
    if (e.key === "Escape") hideCreditsSheet();
    if (e.key === "Escape") hideOffensivaModal();
    if (e.key === "Escape") hideAuthGate();
    if (e.key === "Escape") closeHistoryModal();
  });

  document.addEventListener("click", (e) => {
    const starBtn = e.target.closest(".star-btn");
    if (starBtn && starBtn.closest("[data-review-stars]")) {
      const starsContainer = starBtn.closest("[data-review-stars]");
      const value = Number(starBtn.dataset.star || 0);
      renderStars(starsContainer, value);
      return;
    }

    const toggleBtn = e.target.closest("[data-review-toggle]");
    if (toggleBtn) {
      const widget = toggleBtn.closest("[data-review-widget]");
      if (!widget) return;
      const isOpen = widget.classList.toggle("open");
      setReviewToggleLabel(widget, isOpen);
      return;
    }

    const saveBtn = e.target.closest("[data-review-save]");
    if (saveBtn) {
      const widget = saveBtn.closest("[data-review-widget]");
      submitReview(widget);
    }
  });

  const faqItems = document.querySelectorAll(".faq-accordion .faq-item");
  faqItems.forEach(item => {
    const toggle = item.querySelector("[data-faq-toggle]");
    const answer = item.querySelector(".faq-answer");
    const icon = toggle?.querySelector(".faq-icon");
    if (!toggle || !answer) return;
    toggle.addEventListener("click", () => {
      faqItems.forEach(other => {
        if (other === item) return;
        other.classList.remove("is-open");
        const otherToggle = other.querySelector("[data-faq-toggle]");
        const otherAnswer = other.querySelector(".faq-answer");
        const otherIcon = otherToggle?.querySelector(".faq-icon");
        if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
        if (otherAnswer) otherAnswer.hidden = true;
        if (otherIcon) otherIcon.textContent = "+";
      });
      const isOpen = item.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      answer.hidden = !isOpen;
      if (icon) icon.textContent = isOpen ? "–" : "+";
    });
  });

  document.querySelectorAll("[data-buy-open]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openBuyView();
    });
  });

  document.querySelectorAll("[data-editor-open]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openEditorView();
    });
  });

  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      const container = input.closest(".app-upload") || input.closest(".input-group") || input.parentElement;
      const status = container?.querySelector("[data-upload-status]");
      if (!status) return;
      if (file) {
        status.textContent = `Arquivo selecionado: ${file.name}`;
        status.classList.remove("hidden");
      } else {
        status.textContent = "";
        status.classList.add("hidden");
      }
    });
  });

  // Listeners Nav
  if(btnNavLogin) btnNavLogin.addEventListener("click", () => {
    setAuthReturnPath(resolveAuthReturnPath());
    goToAuth('login');
  });
  if(btnNavRegister) btnNavRegister.addEventListener("click", () => {
    setAuthReturnPath(resolveAuthReturnPath());
    goToAuth('register');
  });
  if(btnCtaStart) btnCtaStart.addEventListener("click", () => openEditorView());
  if(btnCtaLogin) btnCtaLogin.addEventListener("click", () => {
    setAuthReturnPath(resolveAuthReturnPath());
    goToAuth('login');
  });
  if(btnPromoStart) btnPromoStart.addEventListener("click", () => openEditorView());
  if(appLoginBtn) appLoginBtn.addEventListener("click", () => {
    setAuthReturnPath(resolveAuthReturnPath());
    goToAuth('login');
  });
  if(appLogoutBtn) appLogoutBtn.addEventListener("click", () => {
    setToken(null);
    updateTopbarUser(null);
    resetCreditsUI();
    resetAppData();
    showSection("section-landing");
  });
  
  if(btnLogout) btnLogout.addEventListener("click", () => {
    setToken(null);
    updateTopbarUser(null);
    resetCreditsUI();
    resetAppData();
    showSection("section-landing");
  });

  // Auth Internal
  if(btnGoRegister) btnGoRegister.addEventListener("click", (e)=>{ e.preventDefault(); cardLogin.classList.add("hidden"); cardRegister.classList.remove("hidden"); });
  if(btnReturnLogin) btnReturnLogin.addEventListener("click", (e)=>{ e.preventDefault(); cardRegister.classList.add("hidden"); cardLogin.classList.remove("hidden"); });
  if(btnGoForgot) btnGoForgot.addEventListener("click", (e)=>{ e.preventDefault(); cardLogin.classList.add("hidden"); cardForgot.classList.remove("hidden"); });
  if(btnBackFromForgot) btnBackFromForgot.addEventListener("click", (e)=>{ e.preventDefault(); cardForgot.classList.add("hidden"); cardLogin.classList.remove("hidden"); });

  // Submits
  formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgLogin.textContent = "";
    showLoading("Entrando...");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ email: formLogin.email.value, password: formLogin.password.value })
      });
      if(!res.ok) throw new Error("E-mail ou senha incorretos");
      const d = await res.json();
      const token = d?.access_token || d?.token || d?.accessToken;
      if (token) setToken(token);
      await linkAnonSession();
      await fetchMe();
    } catch(err) {
      msgLogin.textContent = err.message;
      msgLogin.className = "form-message error";
    } finally { hideLoading(); }
  });

  formRegister?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgRegister.textContent = "";
    showLoading("Criando conta...");
    try {
      const payload = {
        full_name: formRegister.full_name.value,
        email: formRegister.email.value,
        password: formRegister.password.value,
        device_fingerprint: getDeviceFingerprint()
      };
      if (currentReferralCode) payload.ref = currentReferralCode;
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error("Erro ao criar conta");
      msgRegister.textContent = "Conta criada! Verifique seu e-mail para confirmar o acesso.";
      msgRegister.className = "form-message success";
      if (currentReferralCode) {
        trackEvent("register_with_ref", { ref: currentReferralCode });
      }
      formRegister.reset();
    } catch(err) {
      msgRegister.textContent = err.message;
      msgRegister.className = "form-message error";
    } finally { hideLoading(); }
  });

  formForgot?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgForgot.textContent = "";
    showLoading("Enviando...");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST", headers: getAuthHeaders(), body: JSON.stringify({ email: formForgot.email.value })
      });
      if(!res.ok) throw new Error("Erro");
      msgForgot.textContent = "Link enviado!";
      msgForgot.className = "form-message success";
    } catch(err) {
      msgForgot.textContent = "Erro ao enviar.";
      msgForgot.className = "form-message error";
    } finally { hideLoading(); }
  });

  // Correction Logic
  const tabs = document.querySelectorAll(".switch-tab");
  tabs.forEach(t => {
    t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      const target = t.dataset.target;
      document.getElementById("panel-arquivo").classList.toggle("active", target === "arquivo");
      document.getElementById("panel-texto").classList.toggle("active", target === "texto");
    });
  });

  async function sendCorrection(body, msgEl, isFile = false) {
    hidePostResultAuthNudge();
    if (getToken() && currentCredits !== null && currentCredits <= 0) {
      msgEl.textContent = "Você ficou sem correções ⚠️";
      msgEl.className = "form-message error";
      openPaywallView();
      return;
    }
    showLoading();
    msgEl.textContent = "";
    try {
      const headers = getAuthHeaders({}, { skipContentType: isFile });
      const endpoint = isFile ? "/corrections/file" : "/corrections";
      const res = await fetch(`${API_BASE}${endpoint}`, { method: "POST", headers, body });
      let d = null;
      try { d = await res.json(); } catch (err) { d = null; }

      const nextAction = String(d?.next_action || "").toUpperCase();
      const requiresAuth = Boolean(d?.requires_auth) || nextAction === "PROMPT_SIGNUP";
      const requiresPayment = Boolean(d?.requires_payment) || nextAction === "PROMPT_PAYWALL";
      const freeLeft = extractFreeRemaining(d);
      if (freeLeft !== null) updateFreeRemaining(freeLeft);

      if (requiresAuth) {
        pendingNextRoute = EDITOR_ROUTE;
        setAuthReturnPath(EDITOR_ROUTE);
        showAuthGate();
        return;
      }
      if (requiresPayment) {
        pendingNextRoute = PAYWALL_ROUTE;
        openPaywallView();
        return;
      }
      if (!res.ok) {
        if (res.status >= 500) {
          throw new Error("Serviço indisponível. Tente novamente em instantes.");
        }
        const serverMsg = d?.detail || d?.message || d?.error || "Falha na correção.";
        throw new Error(serverMsg);
      }

      lastEssayId = d?.essay_id || d?.id || d?.resultado?.essay_id || d?.resultado?.id || null;
      lastReview = d?.review || d?.resultado?.review || null;
      const resultado = d?.resultado || d;
      renderResultado(resultado);
      const progressScore = normalizeScore(resultado?.nota_final);
      if (progressScore !== null) setProgressTo800(progressScore);
      updateResultadoReview(lastEssayId, lastReview);
      updateAppResult(resultado);
      const credits = extractCredits(d);
      if (credits !== null) setCreditsUI(credits);
      if (loadHistoricoFn) loadHistoricoFn();
      msgEl.textContent = "Corrigido com sucesso!";
      msgEl.className = "form-message success";
      if (document.body.classList.contains("app-shell")) {
        renderAppView("result");
      } else {
        const resultadoCard = document.getElementById("card-resultado");
        if (resultadoCard) {
          resultadoCard.classList.add("highlight");
          resultadoCard.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => resultadoCard.classList.remove("highlight"), 2000);
        } else {
          document.getElementById("resultado-wrapper")?.scrollIntoView({ behavior: "smooth" });
        }
      }
      if (!getToken() && freeRemaining === 0) {
        showPostResultAuthNudge();
      }
    } catch(err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
    } finally { hideLoading(); }
  }

  formAppText?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msgAppText) msgAppText.textContent = "";
    if (!msgAppText) return;
    lastTema = formAppText.tema_app?.value || "";
    sendCorrection(
      buildTextPayload(formAppText.tema_app.value, formAppText.texto_app.value),
      msgAppText
    );
  });

  formAppFile?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msgAppFile) msgAppFile.textContent = "";
    if (!msgAppFile) return;
    lastTema = formAppFile.tema_app_file?.value || "";
    const fd = buildFilePayload(formAppFile);
    sendCorrection(fd, msgAppFile, true);
  });

  formCorrigir?.addEventListener("submit", (e) => {
    e.preventDefault();
    lastTema = formCorrigir.tema.value || "";
    sendCorrection(buildTextPayload(formCorrigir.tema.value, formCorrigir.texto.value), msgCorrigir);
  });

  formCorrigirArquivo?.addEventListener("submit", (e) => {
    e.preventDefault();
    lastTema = formCorrigirArquivo.tema_arquivo.value || "";
    const fd = buildFilePayload(formCorrigirArquivo);
    sendCorrection(fd, msgCorrigirArquivo, true);
  });

  function renderResultado(res) {
    const el = document.getElementById("resultado-wrapper");
    if(!res || !el) return;
    lastResult = res;
    const comps = (res.competencias || []).map(c => `
      <div class="competencia-card">
        <div class="competencia-header">
           <span>Competência ${c.id}</span>
           <span class="competencia-badge">${c.nota} / 200</span>
        </div>
        <div style="font-size:0.9rem; color:#475569;">${marked.parse(c.feedback||"")}</div>
      </div>
    `).join("");
    el.innerHTML = `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <span style="font-size:0.9rem; color:#64748b;">NOTA FINAL</span><br>
        <span class="resultado-score-pill">${res.nota_final}</span>
      </div>
      <div style="margin-bottom:1.5rem; line-height:1.6;">${marked.parse(res.analise_geral||"")}</div>
      <h4>Detalhamento por competência</h4>
      ${comps}
      <div id="resultado-end-sentinel" style="height:1px;"></div>
    `;
    updateAppResult(res);
    updateShareCard(res);
    setupReviewPopup(res);
  }

  loadHistoricoFn = async () => {
    try {
      const res = await fetch(`${API_BASE}/app/enem/historico`, { headers: getAuthHeaders() });
      if(!res.ok) return;
      const data = await res.json();
      const items = (data.historico || []);
      historyCache = new Map(items.map(item => [String(item.id), item]));
      
      // Update Resumo
      const stats = data.stats || {};
      const scoreValues = items.map(i => normalizeScore(i.nota_final)).filter(n => n !== null);
      const avgScore = normalizeScore(stats.media_nota_final) ?? (scoreValues.length ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length : null);
      const bestScore = normalizeScore(stats.melhor_nota) ?? (scoreValues.length ? Math.max(...scoreValues) : null);

      updateSummaryScores(avgScore, bestScore);
      setOffensivaProgressStats(items.length, bestScore, avgScore);
      const progressBase = avgScore ?? normalizeScore(lastResult?.nota_final) ?? 0;
      setProgressTo800(progressBase);
      renderHistoryCharts(items, avgScore, bestScore);
      
      const list = document.getElementById("historico-list");
      if(list) {
        if(!items.length) list.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:1rem;'>Você ainda não tem histórico. Faça sua primeira correção para começar a acompanhar sua evolução.</p>";
        else {
          list.innerHTML = items.map(i => {
            const review = i.review || null;
            return `
              <div class="historico-item" role="button" tabindex="0" data-essay-id="${i.id}">
                <div class="historico-main">
                  <div>
                    <strong style="display:block; font-size:0.9rem; color:#334155;">${i.tema || "Sem tema"}</strong>
                    <small style="color:#94a3b8;">${new Date(i.created_at).toLocaleDateString()}</small>
                  </div>
                  <span style="font-weight:800; color:var(--brand); font-size:1rem;">${i.nota_final||"-"}</span>
                </div>
                <div class="review-widget" data-review-widget data-essay-id="${i.id}" data-initial-stars="${review?.stars || 0}" data-initial-comment="${encodeAttr(review?.comment || "")}" data-initial-created-at="${encodeAttr(review?.created_at || "")}" data-initial-updated-at="${encodeAttr(review?.updated_at || "")}">
                  <div class="review-summary" data-review-summary>
                    <span class="review-summary-stars" data-review-summary-stars>Sem avaliação</span>
                    <span class="review-badge hidden" data-review-badge></span>
                    <button type="button" class="link-btn review-toggle" data-review-toggle>Avaliar</button>
                  </div>
                  <div class="review-body">
                    <div class="review-intro">
                      <div class="review-header">Avalie esta correção</div>
                      <p class="review-invite">Leva menos de 1 minuto.</p>
                    </div>
                    <div class="review-row">
                      <div class="review-stars" data-review-stars></div>
                      <button type="button" class="duo-btn btn-secondary small" data-review-save>Salvar avaliação</button>
                    </div>
                    <textarea class="review-input" rows="2" placeholder="Comentário (opcional)" data-review-comment></textarea>
                    <p class="form-message" data-review-msg></p>
                  </div>
                </div>
              </div>
            `;
          }).join("");
          hydrateReviewWidgets(list);
        }
      }

      renderAppHistory(items);

      setPaywallCorrections(items.length);
      updateWeeklyStreak(items);

    } catch(e){console.error(e);}
  };

  if(getToken()) fetchMe();
  if (!getToken() && (isEditorRoute() || isPaywallRoute())) {
    fetchMe({ allowCookie: true, preserveToken: true });
  }
});
