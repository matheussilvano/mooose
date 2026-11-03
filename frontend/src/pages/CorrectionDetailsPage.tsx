import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import CorrectionDetails from "../components/corrections/CorrectionDetails";
import { getHistorico, sortHistorico } from "../services/enemHistorico";

export default function CorrectionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getHistorico()
      .then((data) => {
        if (!mounted) return;
        const sorted = sortHistorico(data);
        const found = sorted.find((entry) => String(entry.id) === String(id));
        if (!found) throw new Error("Correção não encontrada.");
        setItem(found);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || "Erro ao carregar correção.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="details-page">
      <Helmet>
        <title>Detalhes · Mooose</title>
      </Helmet>
      <header className="history-header">
        <button type="button" className="history-back" onClick={() => navigate(-1)}>Voltar</button>
        <h1>Detalhes</h1>
      </header>

      <main className="details-content-wrapper">
        {loading ? <div className="details-loading">Carregando...</div> : null}
        {error ? (
          <div className="history-state error">
            <p>{error}</p>
            <button onClick={() => navigate(-1)}>Voltar</button>
          </div>
        ) : null}
        {item && !loading ? <CorrectionDetails item={item} /> : null}
      </main>
    </div>
  );
}
