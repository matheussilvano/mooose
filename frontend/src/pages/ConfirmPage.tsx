import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { API_BASE } from "../lib/api";
import { getAuthHeaders, getToken, setToken } from "../lib/auth";
import { ensureAnonSession } from "../lib/anon";
import { consumeAuthReturnPath, parseAuthParams } from "../lib/authReturn";
import { linkAnonSession } from "../features/editor/editorApi";

export default function ConfirmPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const { token, next } = parseAuthParams(location.search, location.hash);
      if (token) setToken(token);

      const anonId = ensureAnonSession();
      if (getToken()) {
        try {
          await linkAnonSession(anonId);
        } catch {
          // ignore
        }
      }

      try {
        const headers = getToken() ? getAuthHeaders() : { "X-ANON-ID": anonId };
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers,
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!getToken()) {
            const newToken = data?.access_token || data?.token || data?.accessToken;
            if (newToken) setToken(newToken);
          }
        }
      } catch {
        // ignore
      }

      const target = next || consumeAuthReturnPath() || "/editor";
      navigate(target, { replace: true });
    };

    run();
  }, [location.hash, location.search, navigate]);

  return (
    <div className="auth-page">
      <Helmet>
        <title>Mooose · Confirmando acesso</title>
      </Helmet>
      <div className="card confirm-card">
        <h2>Confirmando seu acesso...</h2>
        <p className="card-sub">Só um segundo enquanto liberamos sua conta.</p>
      </div>
    </div>
  );
}
