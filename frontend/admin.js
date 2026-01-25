const API_BASE = "https://mooose-backend.onrender.com";

function getToken() { return localStorage.getItem("token"); }
function setToken(t) { t ? localStorage.setItem("token", t) : localStorage.removeItem("token"); }
function getAuthHeaders(extra = {}) {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}

function showSection(id) {
  document.querySelectorAll(".admin-section").forEach(s => s.classList.remove("visible"));
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
}

function setStatus(message, type = "") {
  const el = document.getElementById("admin-status");
  if (!el) return;
  el.textContent = message || "";
  el.className = type ? `form-message ${type}` : "form-message";
}

const METRIC_INFO = {
  users_created: {
    label: "Usuários criados",
    desc: "Usuários que fizeram a primeira correção no período."
  },
  corrections: {
    label: "Correções realizadas",
    desc: "Total de correções feitas no período."
  },
  sales_approved: {
    label: "Vendas aprovadas",
    desc: "Pagamentos aprovados no período."
  },
  sales_credited: {
    label: "Vendas creditadas",
    desc: "Pagamentos que já geraram créditos."
  },
  credits_sold_credited: {
    label: "Créditos vendidos",
    desc: "Quantidade de créditos creditados (vendas)."
  },
  estimated_revenue: {
    label: "Receita estimada",
    desc: "Estimativa de receita no período (vendas aprovadas).",
    format: "currency"
  },
  active_users: {
    label: "Usuários ativos",
    desc: "Usuários que fizeram pelo menos 1 correção no período."
  }
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function toInputValue(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatShortDate(date, withYear = false) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {})
  });
  return formatter.format(date).replace(".", "");
}

function parseDateLabel(label) {
  if (!label) return null;
  if (typeof label === "number") return new Date(label);
  if (typeof label !== "string") return null;

  const isoDateMatch = label.match(/\d{4}-\d{2}-\d{2}/);
  if (isoDateMatch) {
    const date = new Date(`${isoDateMatch[0]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const monthMatch = label.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const date = new Date(year, month - 1, 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatChartLabels(labels, group) {
  if (!Array.isArray(labels)) return [];
  return labels.map((label) => {
    if (group === "week") {
      const weekMatch = String(label).match(/(\d{4})-W(\d{2})/);
      if (weekMatch) {
        return `sem ${weekMatch[2]}`;
      }
      if (String(label).includes("/")) {
        const parts = String(label).split("/");
        if (parts.length >= 2) {
          const startDate = parseDateLabel(parts[0]);
          const endDate = parseDateLabel(parts[1]);
          if (startDate && endDate) {
            return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
          }
        }
      }
      const date = parseDateLabel(label);
      return date ? formatShortDate(date) : String(label);
    }

    if (group === "month") {
      const date = parseDateLabel(label);
      if (date) {
        return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" })
          .format(date)
          .replace(".", "");
      }
      return String(label);
    }

    const date = parseDateLabel(label);
    return date ? formatShortDate(date) : String(label);
  });
}

function formatLocalISO(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const offsetHour = pad(Math.floor(abs / 60));
  const offsetMin = pad(abs % 60);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMin}`;
}

function formatDateTimePt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date).replace(".", "");
}

function parseInputToISO(value) {
  if (!value) return "";
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  return formatLocalISO(date);
}

function setDefaultRange() {
  const startInput = document.getElementById("admin-start");
  const endInput = document.getElementById("admin-end");
  if (!startInput || !endInput) return;

  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

  startInput.value = toInputValue(firstDay);
  endInput.value = toInputValue(now);
}

async function fetchAdmin(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
  if (res.status === 403) {
    throw new Error("sem_acesso");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.detail || data?.message || "Falha ao carregar métricas.";
    throw new Error(msg);
  }
  return res.json();
}

function parseSeriesArray(arr) {
  if (!Array.isArray(arr)) return null;
  if (!arr.length) return { labels: [], values: [] };

  if (Array.isArray(arr[0])) {
    return {
      labels: arr.map(item => String(item[0])),
      values: arr.map(item => parseNumber(item[1]))
    };
  }

  if (typeof arr[0] === "number") {
    return {
      labels: arr.map((_, idx) => String(idx + 1)),
      values: arr.map(item => parseNumber(item))
    };
  }

  if (typeof arr[0] === "object" && arr[0] !== null) {
    const labels = [];
    const values = [];
    arr.forEach(item => {
      const label =
        item.date ||
        item.period ||
        item.label ||
        item.bucket ||
        item.day ||
        item.week ||
        item.month ||
        item.x ||
        item.created_at ||
        item.start ||
        item.start_date ||
        item.bucket_start ||
        item.period_start;
      const value =
        item.count ??
        item.total ??
        item.value ??
        item.amount ??
        item.y ??
        item.sum ??
        item.corrections ??
        item.users ??
        item.sales ??
        item.revenue ??
        item.approved ??
        item.credits ??
        item.total_count ??
        item.total_users ??
        item.total_corrections ??
        0;
      if (label !== undefined) labels.push(String(label));
      values.push(parseNumber(value));
    });
    return { labels, values };
  }
  return null;
}

function normalizeSeries(data, depth = 0) {
  if (!data) return { labels: [], values: [] };
  if (depth > 3) return { labels: [], values: [] };

  if (Array.isArray(data)) {
    return parseSeriesArray(data) || { labels: [], values: [] };
  }

  if (Array.isArray(data.labels) && (Array.isArray(data.values) || Array.isArray(data.data) || Array.isArray(data.series))) {
    const values = Array.isArray(data.values)
      ? data.values
      : Array.isArray(data.series)
        ? data.series
        : data.data;
    return { labels: data.labels, values: values.map(parseNumber) };
  }

  const nestedKeys = ["data", "series", "points", "items", "results", "buckets", "rows"];
  for (const key of nestedKeys) {
    if (data[key] !== undefined) {
      const normalized = normalizeSeries(data[key], depth + 1);
      if (normalized.labels.length || normalized.values.length) return normalized;
    }
  }

  const values = Object.values(data);
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = normalizeSeries(value, depth + 1);
      if (normalized.labels.length || normalized.values.length) return normalized;
    }
    if (value && typeof value === "object") {
      const normalized = normalizeSeries(value, depth + 1);
      if (normalized.labels.length || normalized.values.length) return normalized;
    }
  }

  if (typeof data === "object") {
    const entries = Object.entries(data).filter(([, value]) => typeof value !== "object");
    if (entries.length) {
      return {
        labels: entries.map(([label]) => String(label)),
        values: entries.map(([, value]) => parseNumber(value))
      };
    }
  }

  return { labels: [], values: [] };
}

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/[^0-9,.-]/g, "");
    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatValue(key, value) {
  if (METRIC_INFO[key]?.format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseNumber(value));
  }
  return new Intl.NumberFormat("pt-BR").format(parseNumber(value));
}

function renderOverview(data, start, end) {
  const container = document.getElementById("overview-cards");
  if (!container) return;
  const entries = Object.entries(data || {}).filter(([_, value]) => typeof value !== "object");
  if (!entries.length) {
    container.innerHTML = "<div class='card admin-card'><p class='card-sub'>Sem dados no período.</p></div>";
    return;
  }
  container.innerHTML = entries.map(([key, value]) => {
    const info = METRIC_INFO[key] || {};
    const label = info.label || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const desc = info.desc || "Métrica agregada do período.";
    const formatted = formatValue(key, value);
    return `
      <div class="card admin-card admin-metric">
        <span class="admin-metric-label">
          ${label}
          <span class="metric-info" data-tooltip="${desc}">ⓘ</span>
        </span>
        <span class="admin-metric-value">${formatted}</span>
        <span class="admin-metric-desc">${desc}</span>
      </div>
    `;
  }).join("");

  const rangeLabel = document.getElementById("admin-range-label");
  if (rangeLabel && start && end) {
    rangeLabel.textContent = `Período: ${formatDateTimePt(start)} → ${formatDateTimePt(end)}`;
  }
}

function renderAbsolute(data) {
  const container = document.getElementById("absolute-cards");
  if (!container) return;
  const entries = Object.entries(data || {}).filter(([_, value]) => typeof value !== "object");
  if (!entries.length) {
    container.innerHTML = "<div class='card admin-card'><p class='card-sub'>Sem dados absolutos.</p></div>";
    return;
  }
  container.innerHTML = entries.map(([key, value]) => {
    const info = METRIC_INFO[key] || {};
    const label = info.label || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const desc = info.desc || "Métrica acumulada desde o início.";
    const formatted = formatValue(key, value);
    return `
      <div class="card admin-card admin-metric">
        <span class="admin-metric-label">
          ${label}
          <span class="metric-info" data-tooltip="${desc}">ⓘ</span>
        </span>
        <span class="admin-metric-value">${formatted}</span>
        <span class="admin-metric-desc">${desc}</span>
      </div>
    `;
  }).join("");
}

function renderTable(data) {
  const container = document.getElementById("corrections-by-user");
  if (!container) return;
  const total = parseNumber(data?.total_corrections);
  const rows = normalizeList(data).map(item => {
    const name = item.full_name || item.email || item.user_email || item.user || item.name || item.id || "—";
    const count = item.corrections ?? item.corrigidas ?? item.count ?? item.total ?? item.value ?? 0;
    const percent = item.percent ?? (total ? (parseNumber(count) / total) * 100 : null);
    const last = item.last_correction_at || "";
    return { name, count, percent, last };
  });
  const ordered = rows
    .map(row => ({ ...row, count: parseNumber(row.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  if (!ordered.length) {
    container.innerHTML = "<p class='card-sub'>Sem dados no período.</p>";
    return;
  }
  const totalText = total ? `Total no período: ${new Intl.NumberFormat("pt-BR").format(total)} correções` : "";
  container.innerHTML = `
    ${totalText ? `<p class="card-sub admin-card-sub">${totalText}</p>` : ""}
    <div class="admin-table-row admin-table-head">
      <span>Usuário</span>
      <span>Correções</span>
      <span>%</span>
      <span>Última</span>
    </div>
    ${ordered.map(row => `
      <div class="admin-table-row">
        <span>${row.name}</span>
        <span>${new Intl.NumberFormat("pt-BR").format(row.count)}</span>
        <span>${row.percent != null ? `${row.percent.toFixed(2).replace(".", ",")}%` : "-"}</span>
        <span>${row.last ? formatDateTimePt(row.last) : "-"}</span>
      </div>
    `).join("")}
  `;
}

function buildChart(ctx, label, labels, values, color, format = "number") {
  if (!ctx) return null;
  const formatter = format === "currency"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    : new Intl.NumberFormat("pt-BR");
  if (!labels.length || !values.length) return null;
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        tension: 0.3,
        fill: true,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.label || "",
            label: (item) => `${label}: ${formatter.format(item.parsed.y ?? 0)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => formatter.format(val)
          }
        }
      }
    }
  });
}

function renderReviews(data, group) {
  const summaryEl = document.getElementById("reviews-summary");
  const distEl = document.getElementById("reviews-distribution");
  const commentsEl = document.getElementById("reviews-comments");

  if (summaryEl) {
    const avg = Number(data?.avg_stars || 0);
    const total = parseNumber(data?.total_reviews || 0);
    const comments = parseNumber(data?.comments_count || 0);
    summaryEl.innerHTML = `
      <div class="reviews-metric">
        <span class="reviews-metric-label">Média</span>
        <span class="reviews-metric-value">${avg ? avg.toFixed(1).replace(".", ",") : "0,0"} ⭐</span>
      </div>
      <div class="reviews-metric">
        <span class="reviews-metric-label">Avaliações</span>
        <span class="reviews-metric-value">${new Intl.NumberFormat("pt-BR").format(total)}</span>
      </div>
      <div class="reviews-metric">
        <span class="reviews-metric-label">Com comentários</span>
        <span class="reviews-metric-value">${new Intl.NumberFormat("pt-BR").format(comments)}</span>
      </div>
    `;
  }

  if (distEl) {
    const dist = data?.distribution || {};
    const total = Object.values(dist).reduce((acc, value) => acc + parseNumber(value), 0) || 1;
    distEl.innerHTML = [5, 4, 3, 2, 1].map(star => {
      const count = parseNumber(dist[String(star)] || 0);
      const width = Math.round((count / total) * 100);
      return `
        <div class="reviews-bar">
          <span>${star}⭐</span>
          <div class="reviews-bar-track">
            <div class="reviews-bar-fill" style="width:${width}%"></div>
          </div>
          <span>${new Intl.NumberFormat("pt-BR").format(count)}</span>
        </div>
      `;
    }).join("");
  }

  if (commentsEl) {
    const comments = Array.isArray(data?.recent_comments) ? data.recent_comments : [];
    if (!comments.length) {
      commentsEl.innerHTML = "<p class='card-sub'>Sem comentários no período.</p>";
    } else {
      commentsEl.innerHTML = comments.map(item => `
        <div class="reviews-comment">
          <div class="reviews-comment-head">
            <span class="reviews-comment-stars">${"★".repeat(item.stars || 0)}${"☆".repeat(5 - (item.stars || 0))}</span>
            <span class="reviews-comment-date">${formatDateTimePt(item.created_at)}</span>
          </div>
          <p>${item.comment || ""}</p>
          <small>${item.user_email || "—"} · ${item.tema || "Sem tema"}</small>
        </div>
      `).join("");
    }
  }

  if (data?.series) {
    const seriesData = normalizeSeries(data.series);
    seriesData.labels = formatChartLabels(seriesData.labels, group);
    if (typeof Chart !== "undefined") {
      if (window.reviewsChartInstance) window.reviewsChartInstance.destroy();
      window.reviewsChartInstance = buildChart(
        document.getElementById("reviewsChart"),
        "Avaliações",
        seriesData.labels,
        seriesData.values,
        "#f59e0b"
      );
      if (!window.reviewsChartInstance) showChartEmpty("reviewsChart", "Sem dados de avaliações no período.");
      else clearChartEmpty("reviewsChart");
    }
  } else {
    showChartEmpty("reviewsChart", "Sem série temporal de avaliações.");
  }
}

function showChartEmpty(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrapper = canvas.closest(".admin-chart");
  if (!wrapper) return;
  wrapper.dataset.empty = "true";
  let emptyEl = wrapper.querySelector(".admin-chart-empty");
  if (!emptyEl) {
    emptyEl = document.createElement("div");
    emptyEl.className = "admin-chart-empty";
    wrapper.appendChild(emptyEl);
  }
  emptyEl.textContent = message;
}

function clearChartEmpty(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrapper = canvas.closest(".admin-chart");
  if (!wrapper) return;
  wrapper.dataset.empty = "false";
  const emptyEl = wrapper.querySelector(".admin-chart-empty");
  if (emptyEl) emptyEl.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login-form");
  const loginMsg = document.getElementById("admin-login-msg");
  const logoutBtn = document.getElementById("admin-logout");
  const refreshBtn = document.getElementById("admin-refresh");
  const filterToday = document.getElementById("admin-filter-today");
  const filterWeek = document.getElementById("admin-filter-week");
  const filterMonth = document.getElementById("admin-filter-month");

  let usersChart = null;
  let correctionsChart = null;
  let salesChart = null;

  function showAccessDenied() {
    setStatus("Sem acesso. Sua conta não está na lista de admins.", "error");
    showSection("admin-login");
  }

  async function loadMetrics() {
    setStatus("Carregando métricas...");
    const startInput = document.getElementById("admin-start");
    const endInput = document.getElementById("admin-end");
    const groupBy = document.getElementById("admin-group-by");
    const timezone = document.getElementById("admin-timezone");
    const start = parseInputToISO(startInput?.value);
    const end = parseInputToISO(endInput?.value);
    const group = groupBy?.value || "day";
    const tz = timezone?.value?.trim();

    const qs = new URLSearchParams({
      start,
      end,
      group_by: group
    });
    if (tz) qs.set("timezone", tz);

    try {
      const [absolute, overview, users, corrections, sales, byUser, reviews] = await Promise.all([
        fetchAdmin(`/admin/metrics/absolute`),
        fetchAdmin(`/admin/metrics/overview?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/users/created?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/corrections?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/sales?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/corrections/by-user?${qs.toString()}&limit=10`),
        fetchAdmin(`/admin/metrics/reviews?${qs.toString()}&limit=20`)
      ]);

      renderAbsolute(absolute);
      renderOverview(overview, start, end);
      renderTable(byUser);
      renderReviews(reviews, group);

      const usersSeries = normalizeSeries(users);
      const correctionsSeries = normalizeSeries(corrections);
      const salesSeries = normalizeSeries(sales);

      if (!usersSeries.labels.length && usersSeries.values.length) {
        usersSeries.labels = usersSeries.values.map((_, idx) => String(idx + 1));
      }
      if (!correctionsSeries.labels.length && correctionsSeries.values.length) {
        correctionsSeries.labels = correctionsSeries.values.map((_, idx) => String(idx + 1));
      }
      if (!salesSeries.labels.length && salesSeries.values.length) {
        salesSeries.labels = salesSeries.values.map((_, idx) => String(idx + 1));
      }

      usersSeries.labels = formatChartLabels(usersSeries.labels, group);
      correctionsSeries.labels = formatChartLabels(correctionsSeries.labels, group);
      salesSeries.labels = formatChartLabels(salesSeries.labels, group);

      if (usersChart) usersChart.destroy();
      if (correctionsChart) correctionsChart.destroy();
      if (salesChart) salesChart.destroy();

      if (typeof Chart === "undefined") {
        setStatus("Charts indisponíveis: erro ao carregar a biblioteca.", "error");
      } else {
        usersChart = buildChart(document.getElementById("usersChart"), "Usuários criados", usersSeries.labels, usersSeries.values, "#2563eb");
        correctionsChart = buildChart(document.getElementById("correctionsChart"), "Correções", correctionsSeries.labels, correctionsSeries.values, "#16a34a");
        salesChart = buildChart(document.getElementById("salesChart"), "Vendas (R$)", salesSeries.labels, salesSeries.values, "#f59e0b", "currency");
        if (!usersChart) showChartEmpty("usersChart", "Sem dados de usuários no período.");
        else clearChartEmpty("usersChart");
        if (!correctionsChart) showChartEmpty("correctionsChart", "Sem dados de correções no período.");
        else clearChartEmpty("correctionsChart");
        if (!salesChart) showChartEmpty("salesChart", "Sem dados de vendas no período.");
        else clearChartEmpty("salesChart");
      }

      setStatus("Métricas atualizadas!", "success");
    } catch (err) {
      if (err.message === "sem_acesso") {
        showAccessDenied();
      } else {
        setStatus(err.message || "Erro ao carregar métricas.", "error");
      }
    }
  }

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";
    loginMsg.className = "form-message";
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || "Falha no login.");
      }
      setToken(data.access_token);
      showSection("admin-dashboard");
      await loadMetrics();
    } catch (err) {
      loginMsg.textContent = err.message;
      loginMsg.className = "form-message error";
    }
  });

  logoutBtn?.addEventListener("click", () => {
    setToken(null);
    showSection("admin-login");
  });

  refreshBtn?.addEventListener("click", () => {
    loadMetrics();
  });

  filterToday?.addEventListener("click", () => {
    const startInput = document.getElementById("admin-start");
    const endInput = document.getElementById("admin-end");
    if (!startInput || !endInput) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    startInput.value = toInputValue(start);
    endInput.value = toInputValue(now);
    loadMetrics();
  });

  filterWeek?.addEventListener("click", () => {
    const startInput = document.getElementById("admin-start");
    const endInput = document.getElementById("admin-end");
    if (!startInput || !endInput) return;
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    startInput.value = toInputValue(start);
    endInput.value = toInputValue(now);
    loadMetrics();
  });

  filterMonth?.addEventListener("click", () => {
    const startInput = document.getElementById("admin-start");
    const endInput = document.getElementById("admin-end");
    if (!startInput || !endInput) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    startInput.value = toInputValue(start);
    endInput.value = toInputValue(now);
    loadMetrics();
  });

  setDefaultRange();
  if (getToken()) {
    showSection("admin-dashboard");
    loadMetrics();
  }
});
