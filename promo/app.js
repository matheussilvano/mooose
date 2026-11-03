// Live GitHub numbers + good first issues. Everything degrades gracefully if the API is unavailable.
const REPO = "matheussilvano/mooose";
const api = (p) => fetch(`https://api.github.com/repos/${REPO}${p}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
const fmt = (n) => Number(n).toLocaleString("pt-BR");
const $ = (s) => document.querySelector(s);

api("").then((d) => {
  document.querySelectorAll("[data-stars]").forEach((el) => (el.textContent = fmt(d.stargazers_count)));
  document.querySelectorAll("[data-forks]").forEach((el) => (el.textContent = fmt(d.forks_count)));
  document.querySelectorAll("[data-issues]").forEach((el) => (el.textContent = fmt(d.open_issues_count)));
}).catch(() => {});

api("/issues?state=open&labels=good%20first%20issue&per_page=6").then((items) => {
  const ul = $("#issues");
  const real = items.filter((i) => !i.pull_request);
  if (!real.length) return;
  ul.innerHTML = "";
  for (const i of real) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = i.html_url; a.target = "_blank"; a.rel = "noopener";
    const num = document.createElement("small"); num.textContent = `#${i.number}`;
    const title = document.createElement("b"); title.textContent = i.title;
    const cta = document.createElement("small"); cta.textContent = `${i.comments} comentários`;
    a.append(num, title, cta); li.append(a); ul.append(li);
  }
}).catch(() => {});

api("/contributors?per_page=24").then((people) => {
  const box = $("#people");
  for (const p of people.filter((x) => x.type === "User")) {
    const a = document.createElement("a"); a.href = p.html_url; a.target = "_blank"; a.rel = "noopener"; a.title = p.login;
    const img = document.createElement("img"); img.src = `${p.avatar_url}&s=88`; img.alt = p.login; img.loading = "lazy";
    a.append(img); box.append(a);
  }
}).catch(() => {});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = document.querySelector(btn.dataset.copy).innerText.replace(/^\s*#.*$/gm, "").trim();
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copiado"; setTimeout(() => (btn.textContent = "Copiar"), 1800); } catch { /* blocked */ }
  });
});

const url = encodeURIComponent(location.origin + location.pathname);
const msg = encodeURIComponent("Mooose: corretor de redação do ENEM 100% open-source. Traga sua IA (tem opção grátis), receba nota por competência e ajude a melhorar o código.");
$("#share-x").href = `https://twitter.com/intent/tweet?text=${msg}&url=${url}`;
$("#share-li").href = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
$("#share-wa").href = `https://wa.me/?text=${msg}%20${url}`;
