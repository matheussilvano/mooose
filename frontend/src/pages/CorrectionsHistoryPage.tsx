import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import CorrectionCard from "../components/corrections/CorrectionCard";
import HistorySearch from "../components/corrections/HistorySearch";
import HistoryFilters from "../components/corrections/HistoryFilters";
import { HistoryListSkeleton } from "../components/corrections/Skeletons";
import { getHistorico, sortHistorico } from "../services/enemHistorico";

export default function CorrectionsHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [inputType, setInputType] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [scoreRange, setScoreRange] = useState("all");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getHistorico()
      .then((data) => {
        if (!mounted) return;
        setItems(sortHistorico(data));
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || "Erro ao carregar histórico.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((item) => (item.tema || "").toLowerCase().includes(q) || JSON.stringify(item.resultado || "").toLowerCase().includes(q));
    }
    if (inputType !== "all") {
      list = list.filter((item) => String(item.input_type || "").toLowerCase().includes(inputType));
    }
    if (reviewStatus === "reviewed") {
      list = list.filter((item) => Boolean(item.review));
    } else if (reviewStatus === "pending") {
      list = list.filter((item) => !item.review);
    }
    if (scoreRange !== "all") {
      const [min, max] = scoreRange.split("-").map(Number);
      list = list.filter((item) => {
        const score = Number(item.nota_final || 0);
        return score >= min && score <= max;
      });
    }
    return list;
  }, [items, inputType, query, reviewStatus, scoreRange]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="history-page">
      <Helmet>
        <title>Histórico · Mooose</title>
      </Helmet>
      <header className="history-header">
        <button type="button" className="history-back" onClick={() => navigate(-1)}>Voltar</button>
        <h1>Histórico</h1>
      </header>

      <main className="history-content">
        <HistorySearch value={query} onChange={setQuery} />
        <HistoryFilters
          inputType={inputType}
          reviewStatus={reviewStatus}
          scoreRange={scoreRange}
          onInputType={setInputType}
          onReviewStatus={setReviewStatus}
          onScoreRange={setScoreRange}
        />

        {loading ? <HistoryListSkeleton /> : null}

        {!loading && error ? (
          <div className="history-state error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Tentar novamente</button>
          </div>
        ) : null}

        {!loading && !error && !filtered.length ? (
          <div className="history-state empty">
            <p>Você ainda não tem correções.</p>
            <button onClick={() => navigate("/editor")}>Enviar primeira redação</button>
          </div>
        ) : null}

        <div className="history-list">
          {visible.map((item) => (
            <CorrectionCard
              key={item.id}
              tema={item.tema || "Sem tema"}
              createdAt={item.created_at}
              score={item.nota_final}
              imageUrl={item.arquivo_url}
              onOpen={() => navigate(`/historico/${item.id}`)}
            />
          ))}
        </div>

        {visibleCount < filtered.length ? (
          <button className="history-load-more" onClick={() => setVisibleCount((prev) => prev + 10)}>
            Carregar mais
          </button>
        ) : null}
      </main>
    </div>
  );
}
