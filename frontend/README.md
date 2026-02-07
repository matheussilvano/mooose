# 🦌 Mooose — Frontend

> Plataforma inteligente de correção de redações no padrão ENEM.

![Status](https://img.shields.io/badge/status-ativo-brightgreen)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss)

---

## 📸 Preview

![Screenshot](./screenshot.png)

---

## 🚀 Sobre o Projeto

O **Mooose** é uma plataforma desenvolvida para auxiliar estudantes na preparação para o ENEM, oferecendo correção de redações com nota por competência e feedback claro.

Este repositório contém o **Frontend** da aplicação (open source). O backend, responsável pela inteligência das correções, é privado.

### 📈 Números do Projeto
- **+1.000** redações corrigidas
- **+356** usuários registrados

---

## ✨ Funcionalidades

- **Landing Page** otimizada para conversão e SEO
- **Área do aluno** (dashboard) mobile-first
- **Editor de redação** (texto e arquivo)
- **Histórico completo** com filtros e detalhes
- **Paywall** com planos e checkout
- **Autenticação** (login, cadastro, verificação e recuperação)
- **Admin** com métricas
- **Blog** com conteúdo educacional

Rotas principais:
- `/` (Landing)
- `/editor`
- `/historico` e `/historico/:id`
- `/paywall`
- `/admin`
- `/blog`

---

## 🛠️ Stack

- **Core:** React 18 + TypeScript + Vite
- **Estilos:** Tailwind CSS + PostCSS + `clsx` + `tailwind-merge`
- **Animações:** Framer Motion
- **Roteamento:** React Router DOM
- **Ícones:** Lucide React
- **Gráficos:** Chart.js
- **Markdown/HTML seguro:** Marked + DOMPurify
- **SEO:** React Helmet Async

---

## 📦 Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

1) Clone o repositório:
```bash
git clone https://github.com/matheussilvano/cooorrige.git
```

2) Entre na pasta:
```bash
cd cooorrige
```

3) Instale as dependências:
```bash
npm install
```

4) Configure a API local (opcional):
Crie um arquivo `.env.local` na raiz com:
```bash
VITE_API_BASE=http://localhost:10000
```

5) Rode o front:
```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🔧 Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run preview` — preview do build local

---

## 🤝 Contribuição

Contribuições são bem-vindas! Siga o fluxo abaixo:

1) Faça um fork do repositório
2) Crie uma branch para sua feature/bugfix:
```bash
git checkout -b feat/minha-feature
```
3) Commit com mensagem clara:
```bash
git commit -m "feat: minha feature"
```
4) Envie sua branch:
```bash
git push origin feat/minha-feature
```
5) Abra um Pull Request com descrição objetiva e prints quando necessário

---

## 📄 Estrutura de Pastas (Resumo)

```
src/
├── app/            # App e roteamento
├── components/     # Componentes reutilizáveis
├── pages/          # Páginas (rotas)
├── services/       # Serviços/integrações (API)
└── styles/         # Estilos globais e tokens
```

---

## 📝 Licença

Este projeto está licenciado sob a **Apache License 2.0**. Veja o arquivo [LICENSE](LICENSE).

---

Feito com 💙 por Matheus Silvano.
