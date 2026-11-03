import { Helmet } from "react-helmet-async";

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <Helmet>
        <title>Página não encontrada | Mooose</title>
      </Helmet>
      <main className="auth-panel narrow">
        <h2 className="auth-title" style={{ textAlign: "center" }}>Página não encontrada</h2>
        <p className="auth-text" style={{ textAlign: "center" }}>
          O link que você tentou acessar não existe ou foi movido.
        </p>
        <a href="/" className="primary-btn" style={{ display: "inline-block" }}>
          Voltar para a Mooose
        </a>
      </main>
    </div>
  );
}
