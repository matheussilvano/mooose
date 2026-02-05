import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { API_BASE } from "../lib/api";

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  useEffect(() => {
    if (!token) {
      setMessage("Erro: Token de redefinição não encontrado na URL.");
      setStatus("error");
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");

    setMessage("");
    setStatus("idle");

    if (!newPassword || !confirmPassword) {
      setMessage("Preencha todos os campos.");
      setStatus("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      setStatus("error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          new_password: newPassword
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = "Falha ao redefinir a senha. O token pode ter expirado.";
        if (data?.detail) {
          if (typeof data.detail === "string") {
            msg = data.detail;
          } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
            msg = data.detail[0].msg;
          }
        }
        throw new Error(msg);
      }
      setMessage(data?.message || "Senha atualizada com sucesso!");
      setStatus("success");
      setIsSuccess(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessage(`Erro: ${errorMsg}`);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <Helmet>
        <title>Redefinir Senha | Mooose</title>
        <meta
          name="description"
          content="Redefina sua senha da Mooose, plataforma de correção de redação do ENEM com IA."
        />
      </Helmet>
      <main className="auth-panel">
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

        {!isSuccess ? (
          <div className="auth-card">
            <h2 className="auth-title">Redefinir senha</h2>
            <p className="auth-text">Escolha uma nova senha para continuar utilizando a Mooose.</p>
            <form onSubmit={handleSubmit}>
              {message && (
                <div className={`form-message ${status === "error" ? "error" : "success"}`}>{message}</div>
              )}
              <label className="form-label">
                Nova senha
                <input className="form-input" type="password" name="new_password" required minLength={4} />
              </label>
              <label className="form-label">
                Confirme a nova senha
                <input className="form-input" type="password" name="confirm_password" required minLength={4} />
              </label>
              <button type="submit" className="primary-btn full" disabled={isSubmitting}>
                Salvar nova senha
              </button>
            </form>
          </div>
        ) : (
          <div className="auth-card">
            <h2 className="auth-title">Sucesso!</h2>
            <p className="form-message success" style={{ fontSize: "1rem" }}>
              {message || "Sua senha foi atualizada."}
            </p>
            <a href="/" className="primary-btn" style={{ marginTop: "1rem", display: "inline-block" }}>
              Ir para o Login
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
