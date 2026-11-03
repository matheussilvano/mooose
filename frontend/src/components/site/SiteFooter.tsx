import { Link } from "react-router-dom";
import { Logo } from "./SiteNav";
import { REPO_URL } from "../../lib/github";

export default function SiteFooter() {
  return (
    <footer className="mz-foot">
      <div className="mz-wrap">
        <div className="mz-foot__grid">
          <div>
            <Logo />
            <p style={{ marginTop: 12, maxWidth: "42ch" }}>Corretor de redação do ENEM de código aberto, feito por estudantes e desenvolvedores para quem estuda.</p>
          </div>
          <div>
            <h4>Projeto</h4>
            <a href={REPO_URL} target="_blank" rel="noreferrer">Código no GitHub</a>
            <a href={`${REPO_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer">Issues para começar</a>
            <a href={`${REPO_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">Como contribuir</a>
            <a href="https://github.com/sponsors/matheussilvano" target="_blank" rel="noreferrer">Apoiar o projeto</a>
          </div>
          <div>
            <h4>Site</h4>
            <Link to="/corrigir">Corrigir redação</Link>
            <Link to="/como-funciona">Como funciona</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </div>
        </div>
        <small>Mooose é um projeto independente, sem vínculo com o INEP ou o MEC. A nota é uma estimativa feita por IA para treino, não uma nota oficial. Licença Apache-2.0; o nome e o logo Mooose são marcas do autor.</small>
      </div>
    </footer>
  );
}
