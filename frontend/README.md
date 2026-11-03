# 🦌 Mooose — Frontend

> An AI-powered essay grading platform for the ENEM exam (Brazil's national high-school exam).

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)

---

## 📸 Preview

![Screenshot](./screenshot.png)

---

## 🚀 About

**Mooose** helps students prepare for the ENEM by grading their essays with a score per competency and clear feedback.

This is the **frontend** of the [Mooose monorepo](../README.md). The open-source grader lives at `/corrigir` (bring your own LLM key); see `../backend` for the API and the LangGraph grading engine.

### 📈 By the numbers
- **1,000+** essays graded
- **356+** registered users

---

## ✨ Features

- **Landing page** optimized for conversion and SEO
- **Student area** (dashboard), mobile-first
- **Essay editor** (typed text or file upload)
- **Full history** with filters and details
- **Paywall** with plans and checkout
- **Authentication** (login, sign-up, verification and recovery)
- **Admin** area with metrics
- **Blog** with educational content

Main routes:
- `/` (landing)
- `/editor`
- `/historico` and `/historico/:id` (history)
- `/paywall`
- `/admin`
- `/blog`

---

## 🛠️ Stack

- **Core:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + PostCSS + `clsx` + `tailwind-merge`
- **Animation:** Framer Motion
- **Routing:** React Router DOM
- **Icons:** Lucide React
- **Charts:** Chart.js
- **Safe Markdown/HTML:** Marked + DOMPurify
- **SEO:** React Helmet Async

---

## 📦 Running locally

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1) Clone the repository:
```bash
git clone https://github.com/matheussilvano/cooorrige.git
```

2) Enter the folder:
```bash
cd cooorrige
```

3) Install dependencies:
```bash
npm install
```

4) Configure the local API (optional):
Create a `.env.local` file in the project root with:
```bash
VITE_API_BASE=http://localhost:10000
```

5) Start the frontend:
```bash
npm run dev
```

Open `http://localhost:5173`

---

## 🔧 Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview the local build

---

## 🤝 Contributing

Contributions are welcome! Follow this flow:

1) Fork the repository
2) Create a branch for your feature or bugfix:
```bash
git checkout -b feat/my-feature
```
3) Commit with a clear message:
```bash
git commit -m "feat: my feature"
```
4) Push your branch:
```bash
git push origin feat/my-feature
```
5) Open a Pull Request with a concise description and screenshots when relevant

---

## 📄 Folder structure (summary)

```
src/
├── app/            # App and routing
├── components/     # Reusable components
├── pages/          # Pages (routes)
├── services/       # Services/integrations (API)
└── styles/         # Global styles and tokens
```

---

## 📝 License

Licensed under the **Apache License 2.0**. See [LICENSE](LICENSE).

---

Made with 💙 by Matheus Silvano.
