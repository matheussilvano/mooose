const API_BASE = "https://mooose-backend.onrender.com";

/* FRASES DE LOADING DIVERTIDAS */
const funnyMessages = [
  "Afiando o lápis virtual...",
  "Consultando os universitários...",
  "Colocando os óculos de leitura...",
  "Caçando erros de vírgula...",
  "Calculando sua nota 1000...",
  "Verificando a coesão...",
  "Analisando a proposta de intervenção..."
];

function showLoading(msg) {
  const overlay = document.getElementById("loading-overlay");
  const msgEl = document.getElementById("loading-msg");
  if (overlay) overlay.classList.remove("hidden");
  
  if (msgEl) {
    msgEl.textContent = msg || funnyMessages[0];
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

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("visible"));
  const el = document.getElementById(id);
  if (el) el.classList.add("visible");
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
let loadHistoricoFn = null;
let chartInstance = null;

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
    showSection("section-dashboard");
    if (loadHistoricoFn) loadHistoricoFn();
  } catch(e) {
    setToken(null);
    updateTopbarUser(null);
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

  const msgLogin = document.getElementById("msg-login");
  const msgRegister = document.getElementById("msg-register");
  const msgForgot = document.getElementById("msg-forgot");
  const msgCorrigir = document.getElementById("msg-corrigir");
  const msgCorrigirArquivo = document.getElementById("msg-corrigir-arquivo");

  updateTopbarUser = (data) => {
    const navAuth = document.getElementById("nav-auth");
    const navLogged = document.getElementById("nav-logged");
    const nameEl = document.getElementById("topbar-user-name");
    
    if (data) {
      navAuth.classList.add("hidden");
      navLogged.classList.remove("hidden");
      if(nameEl) nameEl.textContent = data.full_name?.split(" ")[0] || "Aluno";
    } else {
      navAuth.classList.remove("hidden");
      navLogged.classList.add("hidden");
    }
  };

  function goToAuth(mode='login') {
    showSection("section-auth");
    cardLogin.classList.remove("hidden");
    cardRegister.classList.add("hidden");
    cardForgot.classList.add("hidden");
    if(mode==='register') {
      cardLogin.classList.add("hidden");
      cardRegister.classList.remove("hidden");
    }
  }

  // Listeners Nav
  if(btnNavLogin) btnNavLogin.addEventListener("click", () => goToAuth('login'));
  if(btnCtaStart) btnCtaStart.addEventListener("click", () => goToAuth('register'));
  if(btnCtaLogin) btnCtaLogin.addEventListener("click", () => goToAuth('login'));
  if(btnPromoStart) btnPromoStart.addEventListener("click", () => goToAuth('register'));
  
  if(btnLogout) btnLogout.addEventListener("click", () => { setToken(null); updateTopbarUser(null); showSection("section-landing"); });
  if(btnLogoutTopbar) btnLogoutTopbar.addEventListener("click", () => { setToken(null); updateTopbarUser(null); showSection("section-landing"); });

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
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST", headers: getAuthHeaders(),
        body: JSON.stringify({ full_name: formRegister.full_name.value, email: formRegister.email.value, password: formRegister.password.value })
      });
      if(!res.ok) throw new Error("Erro ao criar conta");
      msgRegister.textContent = "Conta criada! Verifique seu e-mail.";
      msgRegister.className = "form-message success";
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
    showLoading("Corrigindo redação...");
    msgEl.textContent = "";
    try {
      const token = getToken();
      const headers = isFile ? { Authorization: `Bearer ${token}` } : getAuthHeaders();
      const res = await fetch(`${API_BASE}${url}`, { method: "POST", headers, body });
      if(!res.ok) throw new Error("Falha na correção.");
      const d = await res.json();
      renderResultado(d.resultado);
      loadHistoricoFn();
      msgEl.textContent = "Corrigido com sucesso!";
      msgEl.className = "form-message success";
      document.getElementById("resultado-wrapper").scrollIntoView({behavior:"smooth"});
    } catch(err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
    } finally { hideLoading(); }
  }

  formCorrigir?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendCorrection("/app/enem/corrigir-texto", JSON.stringify({ tema: formCorrigir.tema.value, texto: formCorrigir.texto.value }), msgCorrigir);
  });

  formCorrigirArquivo?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(formCorrigirArquivo);
    fd.append("tema", formCorrigirArquivo.tema_arquivo.value);
    sendCorrection("/app/enem/corrigir-arquivo", fd, msgCorrigirArquivo, true);
  });

  function renderResultado(res) {
    const el = document.getElementById("resultado-wrapper");
    if(!res || !el) return;
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
    `;
  }

  loadHistoricoFn = async () => {
    try {
      const res = await fetch(`${API_BASE}/app/enem/historico`, { headers: getAuthHeaders() });
      if(!res.ok) return;
      const data = await res.json();
      const items = (data.historico || []);
      
      // Update Resumo
      const stats = data.stats || {};
      const resumo = document.getElementById("evolucao-resumo");
      if(resumo) {
        resumo.innerHTML = `
          <div style="text-align:center;">
             <small style="color:#64748b; font-weight:700;">MÉDIA</small>
             <div style="font-size:1.4rem; font-weight:800; color:var(--brand);">${stats.media_nota_final?.toFixed(0)||"0"}</div>
          </div>
          <div style="width:1px; background:#e2e8f0;"></div>
          <div style="text-align:center;">
             <small style="color:#64748b; font-weight:700;">MELHOR</small>
             <div style="font-size:1.4rem; font-weight:800; color:#22c55e;">${stats.melhor_nota||"0"}</div>
          </div>
        `;
      }
      
      const list = document.getElementById("historico-list");
      if(list) {
        if(!items.length) list.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:1rem;'>Nenhuma redação ainda.</p>";
        else {
          list.innerHTML = items.map(i => `
            <div style="padding:0.8rem 0; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="display:block; font-size:0.9rem; color:#334155;">${i.tema || "Sem tema"}</strong>
                <small style="color:#94a3b8;">${new Date(i.created_at).toLocaleDateString()}</small>
              </div>
              <span style="font-weight:800; color:var(--brand); font-size:1rem;">${i.nota_final||"-"}</span>
            </div>
          `).join("");
        }
      }
      
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