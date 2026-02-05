import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";

export default function PaywallSuccessPage() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setShowModal(true);
  }, []);

  return (
    <div className="auth-page">
      <Helmet>
        <title>Compra aprovada! · Mooose</title>
        <meta name="description" content="Seus créditos já estão disponíveis para uso." />
      </Helmet>
      {showModal && (
        <div className="success-modal-overlay" role="dialog" aria-modal="true" aria-label="Pagamento aprovado">
          <div className="success-modal-card">
            <button
              type="button"
              className="success-modal-close"
              aria-label="Fechar"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h2 className="auth-title" style={{ textAlign: "center" }}>
              Pagamento aprovado!
            </h2>
            <p className="auth-text" style={{ textAlign: "center" }}>
              Seus créditos já estão disponíveis para uso.
            </p>
            <a href="/editor" className="primary-btn full" style={{ display: "inline-block", textAlign: "center" }}>
              Corrigir nova redação
            </a>
          </div>
        </div>
      )}
      <main className="auth-panel">
        <h2 className="auth-title" style={{ textAlign: "center" }}>
          Pagamento aprovado!
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
