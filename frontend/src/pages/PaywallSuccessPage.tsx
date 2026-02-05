import { Helmet } from "react-helmet-async";

export default function PaywallSuccessPage() {
  return (
    <div className="auth-page">
      <Helmet>
        <title>Compra aprovada! · Mooose</title>
        <meta name="description" content="Seus créditos já estão disponíveis para uso." />
      </Helmet>
      <main className="auth-panel">
        <h2 className="auth-title" style={{ textAlign: "center" }}>
          Compra aprovada! 🎉
        </h2>
        <p className="auth-text" style={{ textAlign: "center" }}>
          Seus créditos já estão disponíveis para uso.
        </p>
        <a href="/editor" className="primary-btn full" style={{ display: "inline-block", textAlign: "center" }}>
          Corrigir nova redação
        </a>
      </main>
    </div>
  );
}
