import ScoreBadge from "./ScoreBadge";
import CompetencyScoreRow from "./CompetencyScoreRow";
import JsonViewer from "./JsonViewer";
import { formatDatePt, getScoreLabel } from "../../services/enemHistorico";

interface CorrectionDetailsProps {
  item: any;
}

export default function CorrectionDetails({ item }: CorrectionDetailsProps) {
  const result = item?.resultado || {};
  const general = result?.analise_geral || result?.feedback_geral || result?.feedback || "";
  const pontosFortes = result?.pontos_fortes || result?.pontosFortes || [];
  const pontosMelhorar = result?.pontos_a_melhorar || result?.pontosMelhorar || [];
  const sugestoes = result?.sugestoes || result?.sugestoes_praticas || [];

  return (
    <div className="details-content">
      <section className="details-summary">
        <div>
          <h1>{item?.tema || "Redação"}</h1>
          <p>{formatDatePt(item?.created_at)} · {item?.input_type || "texto"}</p>
        </div>
        <ScoreBadge score={item?.nota_final} />
        <span className="details-performance">{getScoreLabel(item?.nota_final || 0)}</span>
      </section>

      <section className="details-section">
        <h2>Notas por competência</h2>
        <div className="details-competencias">
          <CompetencyScoreRow label="C1" score={item?.c1_nota} />
          <CompetencyScoreRow label="C2" score={item?.c2_nota} />
          <CompetencyScoreRow label="C3" score={item?.c3_nota} />
          <CompetencyScoreRow label="C4" score={item?.c4_nota} />
          <CompetencyScoreRow label="C5" score={item?.c5_nota} />
        </div>
      </section>

      <section className="details-section">
        <h2>Feedback</h2>
        {general ? <p className="details-text">{general}</p> : <p className="details-text muted">Sem resumo geral.</p>}
        <div className="details-accordion">
          <details>
            <summary>Pontos fortes</summary>
            <ul>
              {(Array.isArray(pontosFortes) ? pontosFortes : [pontosFortes]).filter(Boolean).map((item: string, idx: number) => (
                <li key={`pf-${idx}`}>{item}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Pontos a melhorar</summary>
            <ul>
              {(Array.isArray(pontosMelhorar) ? pontosMelhorar : [pontosMelhorar]).filter(Boolean).map((item: string, idx: number) => (
                <li key={`pm-${idx}`}>{item}</li>
              ))}
            </ul>
          </details>
          <details>
            <summary>Sugestões práticas</summary>
            <ul>
              {(Array.isArray(sugestoes) ? sugestoes : [sugestoes]).filter(Boolean).map((item: string, idx: number) => (
                <li key={`sp-${idx}`}>{item}</li>
              ))}
            </ul>
          </details>
        </div>
        <JsonViewer data={result} />
      </section>

      {item?.arquivo_url ? (
        <section className="details-section">
          <h2>Arquivo enviado</h2>
          <div className="details-file">
            <img src={item.arquivo_url} alt="Redação enviada" loading="lazy" />
            <a href={item.arquivo_url} target="_blank" rel="noreferrer">Abrir original</a>
          </div>
        </section>
      ) : null}

      <section className="details-section">
        <h2>Review</h2>
        {item?.review ? (
          <span className="details-review done">Você já avaliou essa correção</span>
        ) : (
          <div className="details-review pending">
            <span>Você ainda não avaliou esta correção.</span>
            <button type="button">Avaliar correção</button>
          </div>
        )}
      </section>
    </div>
  );
}
