import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Chart from "chart.js/auto";
import Logo from "../components/Logo";
import { API_BASE } from "../lib/api";
import { getAuthHeaders, getToken, setToken } from "../lib/auth";

type MetricInfo = { label: string; desc: string; format?: "currency" };

const METRIC_INFO: Record<string, MetricInfo> = {
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
    desc: "Pagamentos que já geraram correções."
  },
  credits_sold_credited: {
    label: "Correções vendidas",
    desc: "Quantidade de correções creditadas (vendas)."
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toInputValue(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatShortDate(date: Date, withYear = false) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {})
  });
  return formatter.format(date).replace(".", "");
}

function parseDateLabel(label: unknown) {
  if (!label) return null;
  if (typeof label === "number") return new Date(label);
  if (typeof label !== "string") return null;

  const isoDateMatch = label.match(/\\d{4}-\\d{2}-\\d{2}/);
  if (isoDateMatch) {
    const date = new Date(`${isoDateMatch[0]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const monthMatch = label.match(/^(\\d{4})-(\\d{2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const date = new Date(year, month - 1, 1);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatChartLabels(labels: string[], group: string) {
  return labels.map((label) => {
    if (group === "week") {
      const weekMatch = String(label).match(/(\\d{4})-W(\\d{2})/);
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

function formatLocalISO(date: Date) {
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

function formatDateTimePt(value: string) {
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

function parseInputToISO(value: string) {
  if (!value) return "";
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hour || 0, minute || 0, 0);
  return formatLocalISO(date);
}

function parseSeriesArray(arr: any[]) {
  if (!Array.isArray(arr)) return null;
  if (!arr.length) return { labels: [], values: [] };

  if (Array.isArray(arr[0])) {
    return {
      labels: arr.map((item) => String(item[0])),
      values: arr.map((item) => parseNumber(item[1]))
    };
  }

  if (typeof arr[0] === "number") {
    return {
      labels: arr.map((_, idx) => String(idx + 1)),
      values: arr.map((item) => parseNumber(item))
    };
  }

  if (typeof arr[0] === "object" && arr[0] !== null) {
    const labels: string[] = [];
    const values: number[] = [];
    arr.forEach((item) => {
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

function normalizeSeries(data: any, depth = 0): { labels: string[]; values: number[] } {
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

function normalizeList(data: any) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    let cleaned = value.replace(/[^0-9,.-]/g, "");
    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(",", ".");
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatValue(key: string, value: unknown) {
  if (METRIC_INFO[key]?.format === "currency") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseNumber(value));
  }
  return new Intl.NumberFormat("pt-BR").format(parseNumber(value));
}

function ensureSeriesLabels(series: { labels: string[]; values: number[] }) {
  if (!series.labels.length && series.values.length) {
    series.labels = series.values.map((_, idx) => String(idx + 1));
  }
  return series;
}

async function fetchAdmin(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
  if (res.status === 403) throw new Error("sem_acesso");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.detail || data?.message || "Falha ao carregar métricas.";
    throw new Error(msg);
  }
  return res.json();
}

function buildChart(
  ctx: HTMLCanvasElement,
  label: string,
  labels: string[],
  values: number[],
  color: string,
  format: "number" | "currency" = "number"
) {
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
            callback: (val) => formatter.format(val as number)
          }
        }
      }
    }
  });
}

function AdminChart({
  label,
  color,
  format = "number",
  series,
  emptyMessage
}: {
  label: string;
  color: string;
  format?: "number" | "currency";
  series: { labels: string[]; values: number[] };
  emptyMessage: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    if (!series.labels.length || !series.values.length) return;
    chartRef.current = buildChart(canvasRef.current, label, series.labels, series.values, color, format);
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [color, format, label, series.labels, series.values]);

  const isEmpty = !series.labels.length || !series.values.length;

  return (
    <div className="admin-chart">
      <canvas ref={canvasRef} />
      {isEmpty && <div className="admin-chart-empty">{emptyMessage}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [view, setView] = useState<"login" | "dashboard">(getToken() ? "dashboard" : "login");
  const [loginMessage, setLoginMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"" | "error" | "success">("");
  const [rangeLabel, setRangeLabel] = useState("");

  const now = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0), [now]);

  const [filters, setFilters] = useState({
    start: toInputValue(defaultStart),
    end: toInputValue(now),
    group: "day",
    timezone: ""
  });

  const [metrics, setMetrics] = useState<{
    absolute: any;
    overview: any;
    users: any;
    corrections: any;
    sales: any;
    byUser: any;
    reviews: any;
  }>({
    absolute: null,
    overview: null,
    users: null,
    corrections: null,
    sales: null,
    byUser: null,
    reviews: null
  });

  const loadMetrics = useCallback(async (override?: Partial<typeof filters>) => {
    const effective = { ...filters, ...override };
    setStatusMessage("Carregando métricas...");
    setStatusTone("");
    const startIso = parseInputToISO(effective.start);
    const endIso = parseInputToISO(effective.end);
    const qs = new URLSearchParams({
      start: startIso,
      end: endIso,
      group_by: effective.group
    });
    if (effective.timezone.trim()) {
      qs.set("timezone", effective.timezone.trim());
    }

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
      setMetrics({ absolute, overview, users, corrections, sales, byUser, reviews });
      setStatusMessage("Métricas atualizadas!");
      setStatusTone("success");
      if (startIso && endIso) {
        setRangeLabel(`Período: ${formatDateTimePt(startIso)} → ${formatDateTimePt(endIso)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar métricas.";
      if (message === "sem_acesso") {
        setView("login");
        setLoginMessage("Sem acesso. Sua conta não está na lista de admins.");
        setStatusMessage("");
        setStatusTone("");
      } else {
        setStatusMessage(message);
        setStatusTone("error");
      }
    }
  }, [filters]);

  useEffect(() => {
    if (view === "dashboard") {
      loadMetrics();
    }
  }, [loadMetrics, view]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage("");
    const formData = new FormData(event.currentTarget);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.message || "Falha no login.");
      setToken(data.access_token);
      setView("dashboard");
    } catch (err) {
      setLoginMessage(err instanceof Error ? err.message : "Falha no login.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setView("login");
  };

  const handleQuickRange = (type: "today" | "week" | "month") => {
    const nowDate = new Date();
    let start: Date;
    if (type === "today") {
      start = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0);
    } else if (type === "week") {
      const day = (nowDate.getDay() + 6) % 7;
      start = new Date(nowDate);
      start.setDate(nowDate.getDate() - day);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0);
    }
    const nextFilters = {
      ...filters,
      start: toInputValue(start),
      end: toInputValue(nowDate)
    };
    setFilters(nextFilters);
    loadMetrics(nextFilters);
  };

  const absoluteEntries = useMemo(() => {
    if (!metrics.absolute) return [];
    return Object.entries(metrics.absolute).filter(([, value]) => typeof value !== "object");
  }, [metrics.absolute]);

  const overviewEntries = useMemo(() => {
    if (!metrics.overview) return [];
    return Object.entries(metrics.overview).filter(([, value]) => typeof value !== "object");
  }, [metrics.overview]);

  const userRows = useMemo(() => {
    const total = parseNumber(metrics.byUser?.total_corrections);
    const rows = normalizeList(metrics.byUser).map((item: any) => {
      const name = item.full_name || item.email || item.user_email || item.user || item.name || item.id || "—";
      const count = item.corrections ?? item.corrigidas ?? item.count ?? item.total ?? item.value ?? 0;
      const percent = item.percent ?? (total ? (parseNumber(count) / total) * 100 : null);
      const last = item.last_correction_at || "";
      return { name, count: parseNumber(count), percent, last };
    });
    return { rows, total };
  }, [metrics.byUser]);

  const reviewsSummary = useMemo(() => {
    const avg = Number(metrics.reviews?.avg_stars || 0);
    const total = parseNumber(metrics.reviews?.total_reviews || 0);
    const comments = parseNumber(metrics.reviews?.comments_count || 0);
    return { avg, total, comments };
  }, [metrics.reviews]);

  const reviewsDistribution = useMemo(() => {
    const dist = metrics.reviews?.distribution || {};
    const total = Object.values(dist).reduce((acc: number, value: any) => acc + parseNumber(value), 0) || 1;
    return [5, 4, 3, 2, 1].map((star) => {
      const count = parseNumber(dist[String(star)] || 0);
      const width = Math.round((count / total) * 100);
      return { star, count, width };
    });
  }, [metrics.reviews]);

  const reviewsComments = useMemo(() => {
    return Array.isArray(metrics.reviews?.recent_comments) ? metrics.reviews.recent_comments : [];
  }, [metrics.reviews]);

  const usersSeries = useMemo(() => {
    const series = ensureSeriesLabels(normalizeSeries(metrics.users));
    series.labels = formatChartLabels(series.labels, filters.group);
    return series;
  }, [filters.group, metrics.users]);

  const correctionsSeries = useMemo(() => {
    const series = ensureSeriesLabels(normalizeSeries(metrics.corrections));
    series.labels = formatChartLabels(series.labels, filters.group);
    return series;
  }, [filters.group, metrics.corrections]);

  const salesSeries = useMemo(() => {
    const series = ensureSeriesLabels(normalizeSeries(metrics.sales));
    series.labels = formatChartLabels(series.labels, filters.group);
    return series;
  }, [filters.group, metrics.sales]);

  const reviewsSeries = useMemo(() => {
    if (!metrics.reviews?.series) return { labels: [], values: [] };
    const series = ensureSeriesLabels(normalizeSeries(metrics.reviews.series));
    series.labels = formatChartLabels(series.labels, filters.group);
    return series;
  }, [filters.group, metrics.reviews]);

  return (
    <div>
      <Helmet>
        <title>Mooose · Painel Admin</title>
      </Helmet>

      <header className="topbar">
        <div className="topbar-row">
          <a href="/" className="logo-row" aria-label="Mooose">
            <Logo size="md" />
          </a>
          <nav className="nav-links">
            <a href="/" className="nav-item">Voltar ao site</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="admin-login" className={`admin-section ${view === "login" ? "visible" : ""}`}>
          <div className="card admin-card">
            <h1 className="admin-title">Painel Admin</h1>
            <p className="card-sub">Entre com seu e-mail e senha. O acesso é liberado apenas para admins.</p>
            <form id="admin-login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" name="email" placeholder="admin@mooose.com.br" required />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input type="password" name="password" placeholder="Sua senha" required />
              </div>
              <button type="submit" className="duo-btn btn-primary full">Entrar</button>
              {loginMessage && <p className="form-message error" id="admin-login-msg">{loginMessage}</p>}
            </form>
          </div>
        </section>

        <section id="admin-dashboard" className={`admin-section ${view === "dashboard" ? "visible" : ""}`}>
          <div className="admin-toolbar">
            <div>
              <h2>Resumo de métricas</h2>
              <p className="admin-range" id="admin-range-label">{rangeLabel}</p>
            </div>
            <button id="admin-logout" className="duo-btn btn-secondary" style={{ width: "auto" }} onClick={handleLogout}>Sair</button>
          </div>

          <div className="card admin-card">
            <div className="admin-filters">
              <div className="input-group">
                <label>Início</label>
                <input
                  type="datetime-local"
                  id="admin-start"
                  value={filters.start}
                  onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label>Fim</label>
                <input
                  type="datetime-local"
                  id="admin-end"
                  value={filters.end}
                  onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label>Agrupar por</label>
                <select
                  id="admin-group-by"
                  className="admin-select"
                  value={filters.group}
                  onChange={(e) => setFilters((prev) => ({ ...prev, group: e.target.value }))}
                >
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
              </div>
              <div className="input-group">
                <label>Timezone (opcional)</label>
                <input
                  type="text"
                  id="admin-timezone"
                  placeholder="America/Sao_Paulo"
                  value={filters.timezone}
                  onChange={(e) => setFilters((prev) => ({ ...prev, timezone: e.target.value }))}
                />
              </div>
            </div>
            <div className="admin-quick-filters">
              <button type="button" className="duo-btn btn-secondary admin-filter-btn" onClick={() => handleQuickRange("today")}>Hoje</button>
              <button type="button" className="duo-btn btn-secondary admin-filter-btn" onClick={() => handleQuickRange("week")}>Essa semana</button>
              <button type="button" className="duo-btn btn-secondary admin-filter-btn" onClick={() => handleQuickRange("month")}>Esse mês</button>
            </div>
            <div className="admin-actions">
              <button id="admin-refresh" className="duo-btn btn-success" type="button" onClick={() => loadMetrics()}>
                Atualizar métricas
              </button>
              {statusMessage && (
                <p className={`form-message ${statusTone}`} id="admin-status">{statusMessage}</p>
              )}
            </div>
          </div>

          <div className="admin-section-title">
            <h3>Totais desde o início</h3>
            <p className="card-sub admin-card-sub">Visão absoluta das métricas acumuladas.</p>
          </div>
          <div id="absolute-cards" className="admin-card-grid">
            {absoluteEntries.length === 0 ? (
              <div className="card admin-card"><p className="card-sub">Sem dados absolutos.</p></div>
            ) : (
              absoluteEntries.map(([key, value]) => {
                const info = METRIC_INFO[key as string] || {};
                const label = info.label || String(key).replace(/_/g, " ").replace(/\\b\\w/g, (l) => l.toUpperCase());
                const desc = info.desc || "Métrica acumulada desde o início.";
                const formatted = formatValue(String(key), value);
                return (
                  <div key={key} className="card admin-card admin-metric">
                    <span className="admin-metric-label">
                      {label}
                      <span className="metric-info" data-tooltip={desc}>ⓘ</span>
                    </span>
                    <span className="admin-metric-value">{formatted}</span>
                    <span className="admin-metric-desc">{desc}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="admin-section-title">
            <h3>Totais do período</h3>
            <p className="card-sub admin-card-sub">Métricas filtradas pelo intervalo selecionado.</p>
          </div>
          <div id="overview-cards" className="admin-card-grid">
            {overviewEntries.length === 0 ? (
              <div className="card admin-card"><p className="card-sub">Sem dados no período.</p></div>
            ) : (
              overviewEntries.map(([key, value]) => {
                const info = METRIC_INFO[key as string] || {};
                const label = info.label || String(key).replace(/_/g, " ").replace(/\\b\\w/g, (l) => l.toUpperCase());
                const desc = info.desc || "Métrica agregada do período.";
                const formatted = formatValue(String(key), value);
                return (
                  <div key={key} className="card admin-card admin-metric">
                    <span className="admin-metric-label">
                      {label}
                      <span className="metric-info" data-tooltip={desc}>ⓘ</span>
                    </span>
                    <span className="admin-metric-value">{formatted}</span>
                    <span className="admin-metric-desc">{desc}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="admin-grid-2">
            <div className="card admin-card">
              <div className="admin-chart-title">
                <h3>Usuários criados</h3>
                <span className="metric-info" data-tooltip="Total de novos cadastros ao longo do período.">ⓘ</span>
              </div>
              <p className="card-sub admin-card-sub">Evolução de novos cadastros no período.</p>
              <AdminChart label="Usuários criados" color="#5aa1f2" series={usersSeries} emptyMessage="Sem dados de usuários no período." />
            </div>
            <div className="card admin-card">
              <div className="admin-chart-title">
                <h3>Correções realizadas</h3>
                <span className="metric-info" data-tooltip="Quantidade de correções no período, agrupada por dia, semana ou mês.">ⓘ</span>
              </div>
              <p className="card-sub admin-card-sub">Total de correções feitas por dia/semana/mês.</p>
              <AdminChart label="Correções" color="#16a34a" series={correctionsSeries} emptyMessage="Sem dados de correções no período." />
            </div>
          </div>

          <div className="admin-grid-2">
            <div className="card admin-card">
              <div className="admin-chart-title">
                <h3>Vendas</h3>
                <span className="metric-info" data-tooltip="Receita estimada com base em pagamentos aprovados.">ⓘ</span>
              </div>
              <p className="card-sub admin-card-sub">Receita estimada aprovada no período (R$).</p>
              <AdminChart label="Vendas (R$)" color="#f59e0b" series={salesSeries} format="currency" emptyMessage="Sem dados de vendas no período." />
            </div>
            <div className="card admin-card">
              <div className="admin-chart-title">
                <h3>Avaliações</h3>
                <span className="metric-info" data-tooltip="Média das avaliações e distribuição por estrelas no período.">ⓘ</span>
              </div>
              <p className="card-sub admin-card-sub">Resumo das avaliações das correções.</p>
              <div id="reviews-summary" className="reviews-summary">
                <div className="reviews-metric">
                  <span className="reviews-metric-label">Média</span>
                  <span className="reviews-metric-value">{reviewsSummary.avg ? reviewsSummary.avg.toFixed(1).replace(".", ",") : "0,0"} ⭐</span>
                </div>
                <div className="reviews-metric">
                  <span className="reviews-metric-label">Avaliações</span>
                  <span className="reviews-metric-value">{new Intl.NumberFormat("pt-BR").format(reviewsSummary.total)}</span>
                </div>
                <div className="reviews-metric">
                  <span className="reviews-metric-label">Com comentários</span>
                  <span className="reviews-metric-value">{new Intl.NumberFormat("pt-BR").format(reviewsSummary.comments)}</span>
                </div>
              </div>
              <AdminChart label="Avaliações" color="#f59e0b" series={reviewsSeries} emptyMessage={metrics.reviews?.series ? "Sem dados de avaliações no período." : "Sem série temporal de avaliações."} />
              <div id="reviews-distribution" className="reviews-distribution">
                {reviewsDistribution.map((item) => (
                  <div key={item.star} className="reviews-bar">
                    <span>{item.star}⭐</span>
                    <div className="reviews-bar-track">
                      <div className="reviews-bar-fill" style={{ width: `${item.width}%` }}></div>
                    </div>
                    <span>{new Intl.NumberFormat("pt-BR").format(item.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-grid-2">
            <div className="card admin-card">
              <h3>Top 10 · Correções por usuário</h3>
              <p className="card-sub admin-card-sub">Quem mais corrigiu no período.</p>
              <div className="admin-table" id="corrections-by-user">
                {userRows.rows.length === 0 ? (
                  <p className="card-sub">Sem dados no período.</p>
                ) : (
                  <>
                    {userRows.total ? (
                      <p className="card-sub admin-card-sub">Total no período: {new Intl.NumberFormat("pt-BR").format(userRows.total)} correções</p>
                    ) : null}
                    <div className="admin-table-row admin-table-head">
                      <span>Usuário</span>
                      <span>Correções</span>
                      <span>%</span>
                      <span>Última</span>
                    </div>
                    {userRows.rows
                      .slice()
                      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
                      .slice(0, 10)
                      .map((row: { name: string; count: number; percent: number | null; last: string }) => (
                        <div key={`${row.name}-${row.count}`} className="admin-table-row">
                          <span>{row.name}</span>
                          <span>{new Intl.NumberFormat("pt-BR").format(row.count)}</span>
                          <span>{row.percent != null ? `${row.percent.toFixed(2).replace(".", ",")}%` : "-"}</span>
                          <span>{row.last ? formatDateTimePt(row.last) : "-"}</span>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </div>
            <div className="card admin-card">
              <h3>Comentários recentes</h3>
              <p className="card-sub admin-card-sub">O que os alunos estão dizendo.</p>
              <div id="reviews-comments" className="reviews-comments">
                {reviewsComments.length === 0 ? (
                  <p className="card-sub">Sem comentários no período.</p>
                ) : (
                  reviewsComments.map((item: any, index: number) => (
                    <div key={`${item.created_at || index}`} className="reviews-comment">
                      <div className="reviews-comment-head">
                        <span className="reviews-comment-stars">{`${"★".repeat(item.stars || 0)}${"☆".repeat(5 - (item.stars || 0))}`}</span>
                        <span className="reviews-comment-date">{formatDateTimePt(item.created_at)}</span>
                      </div>
                      <p>{item.comment || ""}</p>
                      <small>{item.user_email || "—"} · {item.tema || "Sem tema"}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
