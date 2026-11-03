// Tema claro/escuro
(function () {
  const root = document.documentElement;
  const toggleBtn = document.getElementById("theme-toggle");

  // Carregar preferência salva ou do sistema
  const saved = localStorage.getItem("mooose-theme");
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }

  function updateIcon() {
    const current = root.getAttribute("data-theme");
    if (!toggleBtn) return;
    toggleBtn.setAttribute("aria-label", current === "dark" ? "Ativar tema claro" : "Ativar tema escuro");
  }

  updateIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("mooose-theme", next);
      updateIcon();
    });
  }
})();

// Atualizar ano no rodapé
(function () {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
})();

// Scroll suave para âncoras internas
(function () {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href").substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: "smooth",
        });
      }
    });
  });
})();

// Envio do formulário via mailto
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const company = document.getElementById("company").value.trim();
    const role = document.getElementById("role").value.trim();
    const email = document.getElementById("email").value.trim();
    const vertical = document.getElementById("vertical").value;
    const message = document.getElementById("message").value.trim();

    const to = "contato@mooose.com.br"; // seu e-mail de contato
    const subject = `Novo contato pelo site - ${name || "Interessado(a)"}`;

    const bodyLines = [
      `Nome: ${name}`,
      `Empresa: ${company}`,
      `Cargo: ${role}`,
      `E-mail: ${email}`,
      `Interesse: ${vertical || "não informado"}`,
      "",
      "Detalhes:",
      message || "(sem mensagem)"
    ];

    const body = bodyLines.join("\n");

    const mailtoLink =
      `mailto:${encodeURIComponent(to)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;
  });
})();
