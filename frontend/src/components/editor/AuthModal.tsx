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
    window.location.href = `${API_BASE}/auth/google/start`;
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
