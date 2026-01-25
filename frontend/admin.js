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

function pad(value) {
  return String(value).padStart(2, "0");
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
  const toInputValue = (date) => {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

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

function normalizeSeries(data) {
  if (!data) return { labels: [], values: [] };
  if (Array.isArray(data)) return normalizeSeries({ data });
  if (Array.isArray(data.data)) {
    const labels = [];
    const values = [];
    data.data.forEach(item => {
      const label = item.date || item.period || item.label || item.bucket || item.day || item.week || item.month || item.x;
      const value = item.count ?? item.total ?? item.value ?? item.amount ?? item.y ?? item.sum ?? 0;
      if (label !== undefined) labels.push(String(label));
      values.push(Number(value) || 0);
    });
    return { labels, values };
  }
  if (Array.isArray(data.series)) {
    return normalizeSeries({ data: data.series });
  }
  if (Array.isArray(data.labels) && Array.isArray(data.values)) {
    return { labels: data.labels, values: data.values };
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

function renderOverview(data, start, end) {
  const container = document.getElementById("overview-cards");
  if (!container) return;
  const entries = Object.entries(data || {}).filter(([_, value]) => typeof value !== "object");
  if (!entries.length) {
    container.innerHTML = "<div class='card admin-card'><p class='card-sub'>Sem dados no período.</p></div>";
    return;
  }
  container.innerHTML = entries.map(([key, value]) => {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    return `
      <div class="card admin-card admin-metric">
        <span class="admin-metric-label">${label}</span>
        <span class="admin-metric-value">${value}</span>
      </div>
    `;
  }).join("");

  const rangeLabel = document.getElementById("admin-range-label");
  if (rangeLabel && start && end) {
    rangeLabel.textContent = `Período: ${start} → ${end}`;
  }
}

function renderTable(data) {
  const container = document.getElementById("corrections-by-user");
  if (!container) return;
  const rows = normalizeList(data).map(item => {
    const name = item.email || item.user_email || item.user || item.name || item.full_name || item.id || "—";
    const count = item.count ?? item.total ?? item.corrections ?? item.total_corrections ?? item.value ?? 0;
    return { name, count };
  });
  if (!rows.length) {
    container.innerHTML = "<p class='card-sub'>Sem dados no período.</p>";
    return;
  }
  container.innerHTML = `
    <div class="admin-table-row admin-table-head">
      <span>Usuário</span>
      <span>Correções</span>
    </div>
    ${rows.map(row => `
      <div class="admin-table-row">
        <span>${row.name}</span>
        <span>${row.count}</span>
      </div>
    `).join("")}
  `;
}

function buildChart(ctx, label, labels, values, color) {
  if (!ctx) return null;
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
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("admin-login-form");
  const loginMsg = document.getElementById("admin-login-msg");
  const logoutBtn = document.getElementById("admin-logout");
  const refreshBtn = document.getElementById("admin-refresh");

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
      const [overview, users, corrections, sales, byUser] = await Promise.all([
        fetchAdmin(`/admin/metrics/overview?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/users/created?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/corrections?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/sales?${qs.toString()}`),
        fetchAdmin(`/admin/metrics/corrections/by-user?${qs.toString()}&limit=50`)
      ]);

      renderOverview(overview, start, end);
      renderTable(byUser);

      const usersSeries = normalizeSeries(users);
      const correctionsSeries = normalizeSeries(corrections);
      const salesSeries = normalizeSeries(sales);

      if (usersChart) usersChart.destroy();
      if (correctionsChart) correctionsChart.destroy();
      if (salesChart) salesChart.destroy();

      usersChart = buildChart(document.getElementById("usersChart"), "Usuários", usersSeries.labels, usersSeries.values, "#2563eb");
      correctionsChart = buildChart(document.getElementById("correctionsChart"), "Correções", correctionsSeries.labels, correctionsSeries.values, "#16a34a");
      salesChart = buildChart(document.getElementById("salesChart"), "Vendas", salesSeries.labels, salesSeries.values, "#f59e0b");

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

  setDefaultRange();
  if (getToken()) {
    showSection("admin-dashboard");
    loadMetrics();
  }
});
