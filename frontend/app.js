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
const PROGRESS_TARGET_SCORE = 1000;
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

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

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("visible"));
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
  const isLanding = id === "section-landing";
  document.body.classList.toggle("app-shell", isLanding);
  const appBar = document.getElementById("app-bottom-bar");
  if (appBar) appBar.classList.toggle("hidden", !isLanding);
  const creditsSheet = document.getElementById("credits-sheet");
  if (creditsSheet) creditsSheet.classList.add("hidden");
  if (isLanding && typeof renderAppView === "function") {
    renderAppView(currentAppView || "home");
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* AUTH & TOKEN */
function getToken() { return localStorage.getItem("token"); }
function setToken(t) { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); }
function getAuthHeaders(extra={}) {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

let updateTopbarUser = () => {};
let renderAppView = () => {};
let currentAppView = "home";
let loadHistoricoFn = null;
let chartInstance = null;
let currentCredits = null;
let lastEssayId = null;
let lastReview = null;
let lastResult = null;
let lastTema = "";
let reviewPopupTimer = null;
let reviewPopupShown = false;
let reviewPopupObserver = null;
let paywallShownInSession = false;
let currentReferralCode = "";
let currentReferralLink = "";
let toastTimer = null;
const WEEK_THEME_TEXT = "Os impactos do uso excessivo das redes sociais na saúde mental dos jovens no Brasil";

function shouldUseAppShell() {
  return Boolean(document.querySelector(".app-views") && document.getElementById("app-bottom-bar"));
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

function updateCreditCardCopy(credits) {
  const infoEl = document.querySelector("[data-credit-info]");
  if (!infoEl) return;
  if (credits !== null && Number(credits) <= 0) {
    infoEl.textContent = "Você está sem créditos. Desbloqueie correções para continuar seu treino.";
  } else {
    infoEl.textContent = "Cada correção consome 1 crédito.";
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
}

function resetCreditsUI() {
  currentCredits = null;
  document.querySelectorAll("[data-credit-balance]").forEach(el => {
    el.textContent = "2";
  });
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

function renderAppHistory(items = []) {
  const list = document.getElementById("app-history-list");
  const latest = document.getElementById("app-latest-list");
  if (!list && !latest) return;
  const ordered = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const toItem = (item) => {
    const tema = item.tema || "Sem tema";
    const score = Number(item.nota_final);
    const scoreText = Number.isFinite(score) ? Math.round(score).toString() : "—";
    return `<div class="app-list-item"><span>${tema}</span><strong>${scoreText}</strong></div>`;
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

function updateAppResult(res) {
  const scoreEl = document.querySelector("[data-app-score]");
  const listEl = document.querySelector("[data-app-competencias]");
  const emptyEl = document.querySelector("[data-app-result-empty]");
  if (!scoreEl || !listEl) return;
  if (!res) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    scoreEl.textContent = "—";
    listEl.innerHTML = "";
    return;
  }
  const score = normalizeScore(res.nota_final);
  scoreEl.textContent = score !== null ? Math.round(score).toString() : "—";
  const comps = (res.competencias || []).map(c => {
    return `<div class="app-result-pill"><span>C${c.id}</span><span>${c.nota} / 200</span></div>`;
  }).join("");
  listEl.innerHTML = comps;
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
    cta.textContent = "✍️ Enviar nova redação";
    cta.dataset.action = "send";
  } else {
    cta.textContent = "💳 Desbloquear correções";
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
}

function hideOffensivaModal() {
  const modal = document.getElementById("offensiva-modal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function getWeekStart(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function formatWeekLabel(date) {
  return date.toLocaleDateString("pt-BR", { month: "short", day: "2-digit" });
}

function formatWeekDeadline(weekStart) {
  const end = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  return end.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

function updateWeeklyStreak(items = []) {
  const streakEls = document.querySelectorAll("[data-week-streak]");
  const streakLabelEls = document.querySelectorAll("[data-week-streak-label]");
  const listEl = document.querySelector("[data-week-list]");
  const msgEl = document.querySelector("[data-week-message]");
  const summaryEl = document.querySelector("[data-week-summary]");
  if (!streakEls.length && !listEl && !msgEl && !summaryEl) return;

  const weekSet = new Set();
  items.forEach(item => {
    const raw = item?.created_at || item?.createdAt || item?.date;
    if (!raw) return;
    const weekStart = getWeekStart(raw);
    if (!weekStart) return;
    weekSet.add(weekStart.getTime());
  });

  const sorted = Array.from(weekSet).sort((a, b) => a - b);
  let streak = 0;
  if (sorted.length) {
    streak = 1;
    let current = sorted[sorted.length - 1];
    for (let i = sorted.length - 2; i >= 0; i--) {
      const diff = current - sorted[i];
      if (diff === WEEK_IN_MS) {
        streak += 1;
        current = sorted[i];
      } else if (diff > WEEK_IN_MS) {
        break;
      }
    }
  }

  if (streakEls.length) {
    streakEls.forEach(el => {
      el.textContent = String(streak);
    });
  }
  if (streakLabelEls.length) {
    const label = streak === 1 ? "semana" : "semanas";
    streakLabelEls.forEach(el => {
      el.textContent = label;
    });
  }
  if (msgEl) {
    if (streak >= 2) msgEl.textContent = `🔥 Ofensiva ENEM: ${streak} semanas seguidas.`;
    else if (streak === 1) msgEl.textContent = "📅 Você treinou por 1 semana consecutiva. Continue!";
    else msgEl.textContent = "📅 Você ainda não iniciou sua ofensiva semanal. Que tal começar hoje?";
  }

  const currentWeekStart = getWeekStart(new Date());
  const lastWeekStart = sorted.length ? new Date(sorted[sorted.length - 1]) : null;
  const hasCurrentWeek = currentWeekStart ? weekSet.has(currentWeekStart.getTime()) : false;
  const isPreviousWeek = currentWeekStart && lastWeekStart
    ? (currentWeekStart.getTime() - lastWeekStart.getTime() === WEEK_IN_MS)
    : false;

  let status = "broken";
  if (hasCurrentWeek) status = "active";
  else if (streak > 0 && isPreviousWeek) status = "warning";

  const deadlineLabel = currentWeekStart ? formatWeekDeadline(currentWeekStart) : "";
  updateOffensivaStatus(status, deadlineLabel);
  updateOffensivaMotivation(streak);
  if (summaryEl) {
    summaryEl.textContent = hasCurrentWeek ? "Você treinou esta semana." : "Você treinou esta semana?";
  }

  if (listEl) {
    if (!currentWeekStart) return;
    const weeksToShow = 4;
    const pills = [];
    for (let i = 0; i < weeksToShow; i++) {
      const start = new Date(currentWeekStart.getTime() - i * WEEK_IN_MS);
      const has = weekSet.has(start.getTime());
      const status = has ? "done" : (i === 0 ? "pending" : "missed");
      const label = formatWeekLabel(start);
      const note = !has && i === 0 ? "<span class=\"week-note\">em andamento</span>" : "";
      pills.push(`<div class="week-pill ${status}"><span class="week-icon">${has ? "✓" : "•"}</span><span class="week-label">${label}</span>${note}</div>`);
    }
    listEl.innerHTML = pills.join("");
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

async function startCheckout() {
  if (!getToken()) {
    if (typeof window.goToAuth === "function") {
      window.goToAuth("login");
    } else {
      showSection("section-auth");
    }
    return;
  }
  showLoading("Abrindo checkout...");
  try {
    const res = await fetch(`${API_BASE}/payments/create`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.detail || data?.message || "Falha ao iniciar o pagamento.";
      throw new Error(msg);
    }
    if (!data?.checkout_url) {
      throw new Error("Checkout indisponível. Tente novamente.");
    }
    window.location.href = data.checkout_url;
  } catch (err) {
    alert(err.message || "Erro ao iniciar pagamento.");
  } finally {
    hideLoading();
  }
}

async function fetchMe() {
  const t = getToken();
  if (!t) return;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Sessão inválida");
    const data = await res.json();
    
    const emailEl = document.getElementById("user-email");
    if(emailEl) emailEl.textContent = `${data.full_name || "Usuário"} (${data.email})`;
    
    updateTopbarUser(data);
    const credits = extractCredits(data);
    setCreditsUI(credits);
    if (shouldUseAppShell()) {
      showSection("section-landing");
    } else {
      showSection("section-dashboard");
    }
    if (loadHistoricoFn) loadHistoricoFn();
    loadReferral();
  } catch(e) {
    setToken(null);
    updateTopbarUser(null);
    resetCreditsUI();
    resetAppData();
    showSection("section-landing"); // ou auth
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  const btnNavLogin = document.getElementById("btn-nav-login");
  const btnCtaStart = document.getElementById("btn-cta-start");
  const btnCtaLogin = document.getElementById("btn-cta-login");
  const btnPromoStart = document.getElementById("btn-promo-start");
  const btnLogout = document.getElementById("btn-logout");
  const btnLogoutTopbar = document.getElementById("btn-logout-topbar");
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

  updateTopbarUser = (data) => {
    const navAuth = document.getElementById("nav-auth");
    const navLogged = document.getElementById("nav-logged");
    const nameEl = document.getElementById("topbar-user-name");
    
    if (data) {
      navAuth.classList.add("hidden");
      navLogged.classList.remove("hidden");
      if(nameEl) nameEl.textContent = data.full_name?.split(" ")[0] || "Aluno";
      if (appLoginBtn) appLoginBtn.classList.add("hidden");
      if (appLogoutBtn) appLogoutBtn.classList.remove("hidden");
    } else {
      navAuth.classList.remove("hidden");
      navLogged.classList.add("hidden");
      if (appLoginBtn) appLoginBtn.classList.remove("hidden");
      if (appLogoutBtn) appLogoutBtn.classList.add("hidden");
    }
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
      const param = mode === "login" ? "login=1" : "start=1";
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
  const urlRef = (urlParams.get("ref") || "").trim();
  const startParam = (urlParams.get("start") || "").trim();
  const loginParam = (urlParams.get("login") || "").trim();
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
    } else if (urlRef || startParam || window.location.pathname.includes("/register")) {
      goToAuth("register");
      shouldShowLanding = false;
    }
    if (shouldShowLanding && document.getElementById("section-landing")) {
      showSection("section-landing");
    }
  }
  if (shouldUseAppShell() && document.getElementById("section-landing")?.classList.contains("visible")) {
    document.body.classList.add("app-shell");
    document.getElementById("app-bottom-bar")?.classList.remove("hidden");
  }

  document.querySelectorAll("[data-buy-credits]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      startCheckout();
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
      showCreditsModal();
    });
  });

  offensivaCta?.addEventListener("click", (e) => {
    e.preventDefault();
    const action = offensivaCta.dataset.action || "send";
    if (action === "buy") {
      startCheckout();
      return;
    }
    hideOffensivaModal();
    const target = document.getElementById("card-nova-correcao");
    if (target) target.scrollIntoView({ behavior: "smooth" });
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideCreditsModal();
    if (e.key === "Escape") hideReviewPopup();
    if (e.key === "Escape") hideCreditsSheet();
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

  // Listeners Nav
  if(btnNavLogin) btnNavLogin.addEventListener("click", () => goToAuth('login'));
  if(btnCtaStart) btnCtaStart.addEventListener("click", () => goToAuth('register'));
  if(btnCtaLogin) btnCtaLogin.addEventListener("click", () => goToAuth('login'));
  if(btnPromoStart) btnPromoStart.addEventListener("click", () => goToAuth('register'));
  if(appLoginBtn) appLoginBtn.addEventListener("click", () => goToAuth('login'));
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
  if(btnLogoutTopbar) btnLogoutTopbar.addEventListener("click", () => {
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
      setToken(d.access_token);
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
      msgRegister.textContent = "Conta criada! Verifique seu e-mail.";
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

  async function sendCorrection(url, body, msgEl, isFile=false) {
    if (currentCredits !== null && currentCredits <= 0) {
      msgEl.textContent = "Para enviar, você precisa de créditos.";
      msgEl.className = "form-message error";
      if (document.body.classList.contains("app-shell")) {
        document.getElementById("credits-sheet")?.classList.remove("hidden");
      } else {
        showCreditsModal();
      }
      return;
    }
    showLoading();
    msgEl.textContent = "";
    try {
      const token = getToken();
      const headers = isFile ? { Authorization: `Bearer ${token}` } : getAuthHeaders();
      const res = await fetch(`${API_BASE}${url}`, { method: "POST", headers, body });
      let d = null;
      try { d = await res.json(); } catch (err) { d = null; }
      if(!res.ok) {
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
      const prevCredits = currentCredits;
      if (credits !== null) setCreditsUI(credits);
      loadHistoricoFn();
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
      if (shouldShowPaywallAfterFree(prevCredits, credits)) {
        const correctionsCount = prevCredits !== null ? Number(prevCredits) + 1 : 2;
        if (Number.isFinite(correctionsCount)) setPaywallCorrections(correctionsCount);
        showCreditsModal({ markShown: true });
      }
    } catch(err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
      if (/cr[eé]dito|credits?/i.test(err.message || "")) {
        showCreditsModal();
      }
    } finally { hideLoading(); }
  }

  formAppText?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msgAppText) msgAppText.textContent = "";
    if (!msgAppText) return;
    if (!getToken()) {
      goToAuth("register");
      return;
    }
    lastTema = formAppText.tema_app?.value || "";
    sendCorrection(
      "/app/enem/corrigir-texto",
      JSON.stringify({ tema: formAppText.tema_app.value, texto: formAppText.texto_app.value }),
      msgAppText
    );
  });

  formAppFile?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (msgAppFile) msgAppFile.textContent = "";
    if (!msgAppFile) return;
    if (!getToken()) {
      goToAuth("register");
      return;
    }
    lastTema = formAppFile.tema_app_file?.value || "";
    const fd = new FormData(formAppFile);
    fd.append("tema", formAppFile.tema_app_file.value);
    sendCorrection("/app/enem/corrigir-arquivo", fd, msgAppFile, true);
  });

  formCorrigir?.addEventListener("submit", (e) => {
    e.preventDefault();
    lastTema = formCorrigir.tema.value || "";
    sendCorrection("/app/enem/corrigir-texto", JSON.stringify({ tema: formCorrigir.tema.value, texto: formCorrigir.texto.value }), msgCorrigir);
  });

  formCorrigirArquivo?.addEventListener("submit", (e) => {
    e.preventDefault();
    lastTema = formCorrigirArquivo.tema_arquivo.value || "";
    const fd = new FormData(formCorrigirArquivo);
    fd.append("tema", formCorrigirArquivo.tema_arquivo.value);
    sendCorrection("/app/enem/corrigir-arquivo", fd, msgCorrigirArquivo, true);
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
      
      // Update Resumo
      const stats = data.stats || {};
      const scoreValues = items.map(i => normalizeScore(i.nota_final)).filter(n => n !== null);
      const avgScore = normalizeScore(stats.media_nota_final) ?? (scoreValues.length ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length : null);
      const bestScore = normalizeScore(stats.melhor_nota) ?? (scoreValues.length ? Math.max(...scoreValues) : null);

      const resumo = document.getElementById("evolucao-resumo");
      if(resumo) {
        resumo.innerHTML = `
          <div class="evolucao-metric">
             <small>MÉDIA</small>
             <div class="evolucao-value">${avgScore !== null ? avgScore.toFixed(0) : "0"}</div>
          </div>
          <div class="evolucao-divider"></div>
          <div class="evolucao-metric">
             <small>MELHOR</small>
             <div class="evolucao-value best">${bestScore !== null ? bestScore.toFixed(0) : "0"}</div>
          </div>
        `;
      }

      updateSummaryScores(avgScore, bestScore);
      setOffensivaProgressStats(items.length, bestScore, avgScore);
      const progressBase = avgScore ?? normalizeScore(lastResult?.nota_final) ?? 0;
      setProgressTo800(progressBase);
      
      const list = document.getElementById("historico-list");
      if(list) {
        if(!items.length) list.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:1rem;'>Você ainda não tem histórico. Faça sua primeira correção para começar a acompanhar sua evolução.</p>";
        else {
          list.innerHTML = items.map(i => {
            const review = i.review || null;
            return `
              <div class="historico-item" data-essay-id="${i.id}">
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
      
      // Update Chart
      const canvas = document.getElementById("evolucaoChart");
      if(canvas && typeof Chart !== "undefined" && items.length > 0) {
        const sorted = items.filter(x => typeof x.nota_final==='number').sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        const labels = sorted.map(x => new Date(x.created_at).toLocaleDateString(undefined, {day:'2-digit',month:'2-digit'}));
        const values = sorted.map(x => x.nota_final);

        if(chartInstance) {
          chartInstance.data.labels = labels;
          chartInstance.data.datasets[0].data = values;
          chartInstance.update();
        } else {
          chartInstance = new Chart(canvas.getContext("2d"), {
             type: 'line',
             data: {
               labels,
               datasets: [{
                 label: 'Nota',
                 data: values,
                 borderColor: '#2563eb',
                 backgroundColor: 'rgba(37, 99, 235, 0.1)',
                 tension: 0.3,
                 fill: true
               }]
             },
             options: {
               responsive: true,
               maintainAspectRatio: false,
               plugins: { legend: {display:false} },
               scales: { y: { min: 0, max: 1000 } }
             }
          });
        }
      }

    } catch(e){console.error(e);}
  };

  if(getToken()) fetchMe();
});
