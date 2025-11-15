// app.js (CORRIGIDO)
const API_BASE = "https://mooose-backend.onrender.com";

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

function getAuthHeaders(extra = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function showSection(id) {
  document.querySelectorAll(".section").forEach((s) => {
    s.classList.remove("visible");
  });
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
}

// configuradas depois do DOMContentLoaded
let updateTopbarUser = () => {};
let loadHistoricoFn = null;
let evolucaoChartInstance = null; // instancia do gráfico de evolução

// Atualiza UI com dados do usuário e créditos
async function fetchMeAndCredits() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Falha ao buscar /auth/me");
    const data = await res.json();

    const emailEl = document.getElementById("user-email");
    const creditsEl = document.getElementById("credits-count");

    if (emailEl) {
      const name = data.full_name;
      const email = data.email;
      emailEl.textContent = name ? `${name} · ${email}` : email || "";
    }

    if (creditsEl) {
      creditsEl.textContent =
        typeof data.credits === "number" ? data.credits : "0";
    }

    updateTopbarUser(data);
    showSection("section-dashboard");

    // carrega histórico / evolução ao entrar no dashboard
    if (typeof loadHistoricoFn === "function") {
      try {
        await loadHistoricoFn();
      } catch (e) {
        console.error(e);
      }
    }
  } catch (err) {
    console.error(err);
    setToken(null);
    updateTopbarUser(null);
    showSection("section-auth");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sectionLanding = document.getElementById("section-landing");
  const sectionAuth = document.getElementById("section-auth");

  const btnNavLogin = document.getElementById("btn-nav-login");
  const btnNavRegister = document.getElementById("btn-nav-register");
  const btnCtaStart = document.getElementById("btn-cta-start");
  const btnGoLogin = document.getElementById("btn-go-login");
  const btnLogout = document.getElementById("btn-logout");
  const btnLogoutTopbar = document.getElementById("btn-logout-topbar");

  const formRegister = document.getElementById("form-register");
  const formLogin = document.getElementById("form-login");
  const formCorrigir = document.getElementById("form-corrigir");
  const formCorrigirArquivo = document.getElementById(
    "form-corrigir-arquivo"
  );

  const msgRegister = document.getElementById("msg-register");
  const msgLogin = document.getElementById("msg-login");
  const msgCorrigir = document.getElementById("msg-corrigir");
  const msgCorrigirArquivo = document.getElementById("msg-corrigir-arquivo");
  const msgBuy = document.getElementById("msg-buy");

  const btnSimularSolo = document.getElementById("btn-simular-solo");
  const btnSimularIntensivo = document.getElementById("btn-simular-intensivo");
  const btnSimularUnlimited = document.getElementById("btn-simular-unlimited");

  const creditsEl = document.getElementById("credits-count");
  const resultadoWrapper = document.getElementById("resultado-wrapper");

  const historicoList = document.getElementById("historico-list");
  const evolucaoResumo = document.getElementById("evolucao-resumo");

  // elementos da topbar (estado logado)
  const navAuth = document.getElementById("nav-auth");
  const navLogged = document.getElementById("nav-logged");
  const topbarUserName = document.getElementById("topbar-user-name");
  const topbarUserEmail = document.getElementById("topbar-user-email");

  // função para atualizar topbar
  updateTopbarUser = (data) => {
    if (data) {
      navAuth?.classList.add("hidden");
      navLogged?.classList.remove("hidden");

      if (topbarUserName) {
        topbarUserName.textContent = data.full_name || "Usuário";
      }
      if (topbarUserEmail) {
        topbarUserEmail.textContent = data.email || "";
      }
    } else {
      navAuth?.classList.remove("hidden");
      navLogged?.classList.add("hidden");

      if (topbarUserName) topbarUserName.textContent = "";
      if (topbarUserEmail) topbarUserEmail.textContent = "";
    }
  };

  // função única de logout
  function logoutAndReset() {
    setToken(null);
    updateTopbarUser(null);

    const emailEl = document.getElementById("user-email");
    if (creditsEl) creditsEl.textContent = "–";
    if (emailEl) emailEl.textContent = "";

    // limpa resultado/histórico visual
    if (resultadoWrapper) {
      resultadoWrapper.innerHTML =
        '<p class="placeholder">O detalhamento da correção aparecerá aqui após o envio da redação.</p>';
    }
    if (historicoList) {
      historicoList.innerHTML =
        '<p class="placeholder">Seu histórico de redações corrigidas aparecerá aqui.</p>';
    }
    if (evolucaoResumo) {
      evolucaoResumo.innerHTML =
        '<p class="placeholder">Nenhuma correção ainda. Sua evolução aparece aqui depois da primeira redação. 📈</p>';
    }

    // destrói gráfico se existir
    if (evolucaoChartInstance) {
      evolucaoChartInstance.destroy();
      evolucaoChartInstance = null;
    }

    showSection("section-landing");
    sectionLanding?.scrollIntoView({ behavior: "smooth" });
  }

  // Navegação simples -> ir para auth
  function goToAuth() {
    showSection("section-auth");
    sectionAuth?.scrollIntoView({ behavior: "smooth" });
  }

  btnNavLogin?.addEventListener("click", goToAuth);
  btnNavRegister?.addEventListener("click", goToAuth);
  btnCtaStart?.addEventListener("click", goToAuth);

  btnGoLogin?.addEventListener("click", () => {
    showSection("section-auth");
  });

  btnLogout?.addEventListener("click", logoutAndReset);
  btnLogoutTopbar?.addEventListener("click", logoutAndReset);

  // Registro
  formRegister?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgRegister.textContent = "";
    msgRegister.className = "form-message";

    const formData = new FormData(formRegister);
    const payload = {
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao registrar");
      }

      msgRegister.textContent = "Conta criada com sucesso! Verifique seu e-mail para ativar.";
      msgRegister.classList.add("success");
      formRegister.reset();
    } catch (err) {
      console.error(err);
      msgRegister.textContent = err.message || "Erro ao registrar.";
      msgRegister.classList.add("error");
    }
  });

  // Login
  formLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgLogin.textContent = "";
    msgLogin.className = "form-message";

    const formData = new FormData(formLogin);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao autenticar");
      }

      const data = await res.json();
      setToken(data.access_token);
      msgLogin.textContent = "Login realizado com sucesso.";
      msgLogin.classList.add("success");

      await fetchMeAndCredits();
    } catch (err) {
      console.error(err);
      msgLogin.textContent = err.message || "Erro ao fazer login.";
      msgLogin.classList.add("error");
    }
  });

  // Simular checkout de plano
  async function simularPlano(plano) {
    msgBuy.textContent = "";
    msgBuy.className = "form-message";

    const token = getToken();
    if (!token) {
      msgBuy.textContent = "Faça login para simular a assinatura de um plano.";
      msgBuy.classList.add("error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/app/checkout/simular`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plano }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao simular checkout");
      }

      const data = await res.json();
      if (creditsEl && typeof data.credits === "number") {
        creditsEl.textContent = data.credits;
      }

      msgBuy.textContent = data.message || "Créditos adicionados.";
      msgBuy.classList.add("success");
    } catch (err) {
      console.error(err);
      msgBuy.textContent = err.message || "Erro ao simular plano.";
      msgBuy.classList.add("error");
    }
  }

  btnSimularSolo?.addEventListener("click", () => simularPlano("solo"));
  btnSimularIntensivo?.addEventListener("click", () =>
    simularPlano("intensivo")
  );
  btnSimularUnlimited?.addEventListener("click", () =>
    simularPlano("unlimited")
  );

  // ===== Resultado formatado =====
  function renderResultado(resultado) {
    if (!resultadoWrapper) return;

    if (!resultado || typeof resultado !== "object") {
      resultadoWrapper.innerHTML =
        '<p class="placeholder">Não foi possível interpretar o resultado da correção.</p>';
      return;
    }

    const notaFinal =
      typeof resultado.nota_final === "number" ? resultado.nota_final : null;
    const analise =
      resultado.analise_geral ||
      resultado.analise ||
      "";
    const competencias = Array.isArray(resultado.competencias)
      ? resultado.competencias
      : [];

    let compsHtml = "";
    if (competencias.length) {
      compsHtml = '<div class="competencias-grid">';
      competencias.forEach((c) => {
        const cid =
          typeof c.id === "number" || typeof c.id === "string"
            ? c.id
            : "?";
        const nota =
          typeof c.nota === "number" || typeof c.nota === "string"
            ? c.nota
            : "-";
        const feedback = c.feedback || "";

        compsHtml += `
          <article class="competencia-card">
            <header class="competencia-header">
              <span class="competencia-label">Competência ${cid}</span>
              <span class="competencia-badge">${nota}<span class="competencia-max"> / 200</span></span>
            </header>
            <p class="competencia-feedback">${feedback}</p>
          </article>
        `;
      });
      compsHtml += "</div>";
    }

    const rawJson = JSON.stringify(resultado, null, 2);

    resultadoWrapper.innerHTML = `
      <div class="resultado-main">
        <div class="resultado-top">
          <div>
            <span class="resultado-label">Nota final</span>
            <div class="resultado-score-pill">
              ${notaFinal !== null ? notaFinal : "-"}
              <span class="resultado-score-max">/ 1000</span>
            </div>
          </div>
          <div class="resultado-meta">
            <span class="resultado-tag">Correção automática ENEM</span>
          </div>
        </div>
        ${
          analise
            ? `<p class="resultado-analise">${analise}</p>`
            : ""
        }
        ${compsHtml}
        <details class="resultado-raw">
          <summary>Ver JSON bruto da correção</summary>
          <pre>${rawJson}</pre>
        </details>
      </div>
    `;
  }

  // ===== GRÁFICO DE EVOLUÇÃO =====
  function updateEvolucaoChart(items) {
    const canvas = document.getElementById("evolucaoChart");
    if (!canvas || typeof Chart === "undefined") return;

    const ctx = canvas.getContext("2d");
    const pontos = (items || [])
      .filter((it) => typeof it.nota_final === "number")
      .sort(
        (a, b) =>
          new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );

    if (!pontos.length) {
      if (evolucaoChartInstance) {
        evolucaoChartInstance.destroy();
        evolucaoChartInstance = null;
      }
      return;
    }

    const labels = pontos.map((it) => {
      const d = new Date(it.created_at);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    });

    const values = pontos.map((it) => it.nota_final);

    if (evolucaoChartInstance) {
      evolucaoChartInstance.data.labels = labels;
      evolucaoChartInstance.data.datasets[0].data = values;
      evolucaoChartInstance.update();
    } else {
      evolucaoChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Nota final",
              data: values,
              tension: 0.3,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 1000,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
    }
  }

  // ===== Histórico / evolução =====

  function renderHistorico(data) {
    if (!historicoList || !evolucaoResumo) return;

    const items = (data && data.historico) || [];

    // HISTÓRICO
    historicoList.innerHTML = "";
    if (!items.length) {
      historicoList.innerHTML =
        '<p class="placeholder">Você ainda não corrigiu nenhuma redação. Assim que corrigir a primeira, o histórico aparece aqui. 🎯</p>';
    } else {
      const ul = document.createElement("ul");
      ul.className = "historico-list";

      // mais recente primeiro
      items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
        .forEach((item) => {
          const li = document.createElement("li");
          li.className = "historico-item";

          const dataCorr = item.created_at
            ? new Date(item.created_at)
            : null;
          const dataStr = dataCorr
            ? dataCorr.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "";

          const tipoLabel =
            item.input_type === "arquivo" ? "Foto/PDF" : "Texto";

          const notaFinal =
            typeof item.nota_final === "number" ? item.nota_final : null;

          let detalhesHtml = "";
          if (item.resultado) {
            detalhesHtml += `<pre>${JSON.stringify(
              item.resultado,
              null,
              2
            )}</pre>`;
          }

          // ================================================================
          // CORREÇÃO APLICADA AQUI
          // O backend agora envia a URL completa (Cloudinary/S3).
          // Não precisamos mais adicionar o "API_BASE".
          // ================================================================
          if (item.input_type === "arquivo" && item.arquivo_url) {
            // const base = API_BASE.replace(/\/$/, ""); // <-- LINHA ANTIGA (REMOVIDA)
            // const url = `${base}${item.arquivo_url}`; // <-- LINHA ANTIGA (REMOVIDA)
            
            const url = item.arquivo_url; // <-- LINHA NOVA (CORRETA)
            
            detalhesHtml += `<a href="${url}" target="_blank" rel="noopener" class="link-download">Ver arquivo enviado</a>`;
          }
          // ================================================================
          // FIM DA CORREÇÃO
          // ================================================================

          li.innerHTML = `
            <div class="historico-main">
              <div>
                <div class="historico-tema">${
                  item.tema || "Tema não informado"
                }</div>
                <div class="historico-meta">
                  <span>${dataStr || ""}</span>
                  <span>• ${tipoLabel}</span>
                </div>
              </div>
              <div class="historico-score">
                ${
                  notaFinal !== null
                    ? `<span class="score-badge">${notaFinal}</span>`
                    : `<span class="score-badge">-</span>`
                }
                <span class="score-label">/ 1000</span>
              </div>
            </div>
            <details class="historico-details">
              <summary>Ver detalhes da correção</summary>
              ${detalhesHtml}
            </details>
          `;
          ul.appendChild(li);
        });

      historicoList.appendChild(ul);
    }

    // RESUMO / EVOLUÇÃO
    const stats = (data && data.stats) || {};
    const media = stats.media_nota_final;
    const melhor = stats.melhor_nota;
    const ultima = stats.ultima_nota;

    evolucaoResumo.innerHTML = "";
    if (!items.length) {
      evolucaoResumo.innerHTML =
        '<p class="placeholder">Nenhuma correção ainda. Sua evolução aparece aqui depois da primeira redação. 📈</p>';
    } else {
      evolucaoResumo.innerHTML = `
        <div class="evolucao-grid">
          <div class="evo-card">
            <span class="evo-label">Média geral</span>
            <span class="evo-value">${
              typeof media === "number" ? media.toFixed(0) : "-"
            }</span>
          </div>
          <div class="evo-card">
            <span class="evo-label">Melhor nota</span>
            <span class="evo-value">${
              typeof melhor === "number" ? melhor : "-"
            }</span>
          </div>
          <div class="evo-card">
            <span class="evo-label">Última redação</span>
            <span class="evo-value">${
              typeof ultima === "number" ? ultima : "-"
            }</span>
          </div>
        </div>
      `;
    }

    // atualiza gráfico
    updateEvolucaoChart(items);
  }

  loadHistoricoFn = async function () {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/app/enem/historico`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Falha ao carregar histórico de redações.");
      }
      const data = await res.json();
      renderHistorico(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Correção por texto
  formCorrigir?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgCorrigir.textContent = "";
    msgCorrigir.className = "form-message";

    const token = getToken();
    if (!token) {
      msgCorrigir.textContent = "Faça login para corrigir sua redação.";
      msgCorrigir.classList.add("error");
      return;
    }

    const btn = formCorrigir.querySelector('button[type="submit"]');
    const originalLabel = btn ? btn.textContent : "";

    if (btn) {
      btn.disabled = true;
      btn.classList.add("button-loading");
      btn.textContent = "Corrigindo...";
    }

    const formData = new FormData(formCorrigir);
    const payload = {
      tema: formData.get("tema"),
      texto: formData.get("texto"),
    };

    try {
      const res = await fetch(`${API_BASE}/app/enem/corrigir-texto`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Falha ao corrigir redação");
      }

      const data = await res.json();

      if (creditsEl && typeof data.credits === "number") {
        creditsEl.textContent = data.credits;
      }

      if (data.resultado) {
        renderResultado(data.resultado);
      }

      msgCorrigir.textContent = "Redação corrigida com sucesso.";
      msgCorrigir.classList.add("success");

      // atualizar histórico / evolução
      if (typeof loadHistoricoFn === "function") {
        loadHistoricoFn();
      }
    } catch (err) {
      console.error(err);
      msgCorrigir.textContent = err.message || "Erro ao corrigir redação.";
      msgCorrigir.classList.add("error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("button-loading");
        btn.textContent = originalLabel;
      }
    }
  });

  // Correção por arquivo (foto/PDF)
  formCorrigirArquivo?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msgCorrigirArquivo.textContent = "";
    msgCorrigirArquivo.className = "form-message";

    const token = getToken();
    if (!token) {
      msgCorrigirArquivo.textContent =
        "Faça login para corrigir sua redação.";
      msgCorrigirArquivo.classList.add("error");
      return;
    }

    const btn = formCorrigirArquivo.querySelector('button[type="submit"]');
    const originalLabel = btn ? btn.textContent : "";

    if (btn) {
      btn.disabled = true;
      btn.classList.add("button-loading");
      btn.textContent = "Corrigindo...";
    }

    const formData = new FormData(formCorrigirArquivo);
    const payload = new FormData();
    // AQUI ESTÁ CORRETO: O backend espera a key "tema"
    payload.append("tema", formData.get("tema_arquivo"));
    const file = formData.get("arquivo");
    if (file) {
      payload.append("arquivo", file);
    }

    try {
      const res = await fetch(`${API_BASE}/app/enem/corrigir-arquivo`, {
        method: "POST",
        headers: {
          // NÃO use Content-Type: application/json para FormData
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || "Falha ao corrigir redação (arquivo)"
        );
      }

      const data = await res.json();

      if (creditsEl && typeof data.credits === "number") {
        creditsEl.textContent = data.credits;
      }

      if (data.resultado) {
        renderResultado(data.resultado);
      }

      msgCorrigirArquivo.textContent = "Redação corrigida com sucesso.";
      msgCorrigirArquivo.classList.add("success");

      // atualizar histórico / evolução
      if (typeof loadHistoricoFn === "function") {
        loadHistoricoFn();
      }
    } catch (err) {
      console.error(err);
      msgCorrigirArquivo.textContent =
        err.message || "Erro ao corrigir redação (arquivo).";
      msgCorrigirArquivo.classList.add("error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("button-loading");
        btn.textContent = originalLabel;
      }
    }
  });

  // Switch: Foto/PDF <-> Texto
  const switchTabs = document.querySelectorAll(".switch-tab");
  const panelArquivo = document.getElementById("panel-arquivo");
  const panelTexto = document.getElementById("panel-texto");

  switchTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;

      switchTabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (panelArquivo && panelTexto) {
        if (target === "arquivo") {
          panelArquivo.classList.add("active");
          panelTexto.classList.remove("active");
        } else {
          panelTexto.classList.add("active");
          panelArquivo.classList.remove("active");
        }
      }
    });
  });

  // Se já tiver token salvo, tenta logar direto no dashboard
  if (getToken()) {
    fetchMeAndCredits();
  } else {
    showSection("section-landing");
    updateTopbarUser(null);
  }
});