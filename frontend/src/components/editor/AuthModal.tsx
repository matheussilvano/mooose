import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { API_BASE } from "../../lib/api";
import { getAuthHeaders, setToken } from "../../lib/auth";
import { ensureAnonSession } from "../../lib/anon";
import { getDeviceFingerprint } from "../../lib/device";
import { linkAnonSession } from "../../features/editor/editorApi";
import { useToast } from "../ui/Toast";
import { setAuthReturnPath } from "../../lib/authReturn";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  returnPath?: string;
  defaultMode?: "login" | "register";
}

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export default function AuthModal({ open, onClose, onSuccess, returnPath = "/editor", defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [defaultMode, open]);

  const startGoogleAuth = () => {
    setAuthReturnPath(returnPath);
    const params = new URLSearchParams({ redirect: returnPath });
    window.location.href = `${API_BASE}/auth/google/start?${params.toString()}`;
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      if (!res.ok) throw new Error("E-mail ou senha incorretos");
      const data = await res.json();
      const token = data?.access_token || data?.token || data?.accessToken;
      if (token) setToken(token);
      const anonId = ensureAnonSession();
      await linkAnonSession(anonId);
      await onSuccess();
      toast.push("Login realizado!");
      onClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const payload = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        password: formData.get("password"),
        device_fingerprint: getDeviceFingerprint()
      };
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Erro ao criar conta");
      setMessage("Conta criada! Verifique seu e-mail para confirmar o acesso.");
      toast.push("Conta criada com sucesso!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: formData.get("email") })
      });
      if (!res.ok) throw new Error("Erro ao enviar.");
      setMessage("Link enviado!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha"}>
      <div className="space-y-4">
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <Button type="button" variant="secondary" full onClick={startGoogleAuth}>
              <GoogleIcon />
              Continuar com Google
            </Button>
            <div className="text-center text-xs text-text-muted">ou</div>
            <Input name="email" type="email" placeholder="E-mail" required />
            <Input name="password" type="password" placeholder="Senha" required />
            <Button full loading={loading}>Entrar</Button>
            <div className="flex justify-between text-xs text-text-muted">
              <button type="button" onClick={() => setMode("register")}>Criar conta</button>
              <button type="button" onClick={() => setMode("forgot")}>Esqueci a senha</button>
            </div>
          </form>
        )}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <Button type="button" variant="secondary" full onClick={startGoogleAuth}>
              <GoogleIcon />
              Continuar com Google
            </Button>
            <div className="text-center text-xs text-text-muted">ou</div>
            <Input name="full_name" placeholder="Nome completo" required />
            <Input name="email" type="email" placeholder="E-mail" required />
            <Input name="password" type="password" placeholder="Senha (mín. 4 caracteres)" required minLength={4} />
            <Button full loading={loading}>Criar conta</Button>
            <div className="text-xs text-text-muted">
              <button type="button" onClick={() => setMode("login")}>Já tenho conta</button>
            </div>
          </form>
        )}
        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-3">
            <Input name="email" type="email" placeholder="E-mail cadastrado" required />
            <Button full loading={loading}>Enviar link</Button>
            <div className="text-xs text-text-muted">
              <button type="button" onClick={() => setMode("login")}>Voltar ao login</button>
            </div>
          </form>
        )}
        {message && <p className="text-xs text-text-muted">{message}</p>}
      </div>
    </Modal>
  );
}
