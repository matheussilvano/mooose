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
