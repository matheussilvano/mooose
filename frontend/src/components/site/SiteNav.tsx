import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Star, X } from "lucide-react";
import GithubMark from "./GithubMark";
import { REPO_URL, useRepoStats } from "../../lib/github";

export function Logo() {
  return (
    <Link to="/" className="mz-logo" aria-label="Mooose, página inicial">
      M<b>OOO</b>SE
    </Link>
  );
}

const links = [
  { to: "/#como-funciona", label: "Como funciona" },
  { to: "/#competencias", label: "Competências" },
  { to: "/#provedores", label: "Provedores" },
  { to: "/#codigo-aberto", label: "Código aberto" }
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const stats = useRepoStats();
  return (
    <header className="mz-nav">
      <div className="mz-wrap mz-nav__row">
        <Logo />
        <nav className={`mz-nav__links${open ? " is-open" : ""}`} aria-label="Principal">
          {links.map((l) => (
            <a key={l.to} href={l.to} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <NavLink to="/blog" onClick={() => setOpen(false)}>
            Blog
          </NavLink>
        </nav>
        <div className="mz-nav__right">
          <a className="mz-btn mz-btn--sm mz-btn--ghost" href={REPO_URL} target="_blank" rel="noreferrer">
            <GithubMark />
            <span className="mz-stars">
              <Star size={15} fill="currentColor" aria-hidden />
              {stats ? stats.stars.toLocaleString("pt-BR") : "Star"}
            </span>
            <span className="mz-sr">no GitHub</span>
          </a>
          <Link className="mz-btn mz-btn--sm mz-btn--primary" to="/corrigir">
            Corrigir redação
          </Link>
          <button className="mz-btn mz-btn--sm mz-btn--ghost mz-nav__burger" aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
