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
    const theme = root.getAttribute("data-theme");
    toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  updateIcon();

  toggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("mooose-theme", next);
    updateIcon();
  });
})();

// Menu mobile
(function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (!menuToggle || !navLinks) return;

  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "a") {
      navLinks.classList.remove("open");
    }
  });
})();

// Ano atual no rodapé
document.getElementById("year").textContent = new Date().getFullYear();

// Scroll suave para links âncora
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", function (e) {
    const targetId = this.getAttribute("href").slice(1);
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
      `Interesse: ${vertical || "Não informado"}`,
      "",
      "Mensagem:",
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

