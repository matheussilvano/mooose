import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { API_BASE } from "../lib/api";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Aguarde um momento.");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  useEffect(() => {
    if (!token) {
      setMessage("Erro: Token de verificação não encontrado na URL.");
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.detail || "Falha ao verificar o token.");
        }
        setMessage(data?.message || "E-mail verificado com sucesso!");
        setStatus("success");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessage(`Erro: ${errorMsg}`);
        setStatus("error");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-page">
      <Helmet>
        <title>Verificando e-mail... | Mooose</title>
        <meta
          name="description"
          content="Verifique seu e-mail para ativar sua conta na Mooose, plataforma de correção de redação do ENEM com IA."
        />
      </Helmet>
      <main className="auth-panel narrow">
        <div className="logo-area">
          <div className="logo-row">
            <img src="/logo.png" alt="Mooose" className="mooose-logo" />
            <span className="logo-word">
              <span className="logo-m">M</span>
              <span className="logo-o logo-o-1">O</span>
              <span className="logo-o logo-o-2">O</span>
              <span className="logo-o logo-o-3">O</span>
              <span className="logo-rest">S</span>
              <span className="logo-rest">E</span>
            </span>
          </div>
          <span className="logo-subtitle">
            Correção de redações do ENEM com IA <span className="badge-edu">1 correção grátis</span>
          </span>
        </div>

        <h2 className="auth-title" style={{ textAlign: "center" }}>
          Verificando seu e-mail...
        </h2>
        <p className={`verification-message ${status === "success" ? "success" : status === "error" ? "error" : ""}`}>
          {message}
        </p>
        <a href="/" className="auth-link">
          Voltar para a Mooose
        </a>
      </main>
    </div>
  );
}
