/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}", "./public/**/*.html"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        brand: "var(--brand)",
        "brand-light": "var(--brand-light)",
        "brand-dark": "var(--brand-dark)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        success: "var(--success)",
        danger: "var(--danger)",
        border: "var(--border)"
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "16px"
      },
      boxShadow: {
        cartoon: "var(--shadow-cartoon)",
        soft: "0 18px 40px rgba(15, 23, 42, 0.08)",
        modal: "0 24px 60px rgba(15, 23, 42, 0.25)"
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "-apple-system", "sans-serif"],
        display: ["Nunito", "system-ui", "-apple-system", "sans-serif"]
      }
    }
  },
  plugins: []
};
