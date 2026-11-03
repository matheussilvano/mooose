import ScoreBadge from "./ScoreBadge";
import CompetencyScoreRow from "./CompetencyScoreRow";
import JsonViewer from "./JsonViewer";
import { useEssayArquivoUrl } from "../../features/editor/useEssayArquivoUrl";
import { normalizeScore } from "../../lib/normalize";
import { formatDatePt, getEssayId, getResultErrorMessage, getScoreLabel, getSignedUrlKind, isOcrError } from "../../services/enemHistorico";

interface CorrectionDetailsProps {
  item: any;
}

export default function CorrectionDetails({ item }: CorrectionDetailsProps) {
  const result = item?.resultado || {};
  const general = result?.analise_geral || result?.feedback_geral || result?.feedback || "";
  const pontosFortes = result?.pontos_fortes || result?.pontosFortes || [];
  const pontosMelhorar = result?.pontos_a_melhorar || result?.pontosMelhorar || [];
  const sugestoes = result?.sugestoes || result?.sugestoes_praticas || [];
  const hasOcrError = isOcrError(item);
  const ocrErrorMessage = hasOcrError ? getResultErrorMessage(item) : "";
  const essayId = getEssayId(item);
  const score = normalizeScore(item?.nota_final);
  const { url: fileUrl, loading: fileLoading, error: fileError, refresh: refreshFileUrl } = useEssayArquivoUrl(essayId, { enabled: Boolean(essayId) });
  const fileKind = getSignedUrlKind(fileUrl);
  const fileIsPdf = fileKind !== "image";

  return (
    <div className="details-content">
      <section className="details-summary">
        <div>
          <h1>{item?.tema || "Redação"}</h1>
          <p>{formatDatePt(item?.created_at)} · {item?.input_type || "texto"}</p>
        </div>
        {hasOcrError ? (
          <span className="details-ocr-badge">Erro de OCR</span>
        ) : (
          <>
            <ScoreBadge score={score} />
            <span className="details-performance">{score === null ? "Sem nota" : getScoreLabel(score)}</span>
          </>
        )}
      </section>

      {hasOcrError ? (
        <section className="details-section">
          <h2>Falha na leitura OCR</h2>
          <p className="details-text">{ocrErrorMessage}</p>
          <p className="details-text muted">Não houve correção nem débito de crédito para esta tentativa.</p>
        </section>
      ) : null}

      {!hasOcrError ? (
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
      ) : null}

      {!hasOcrError ? (
        <section className="details-section">
          <h2>Feedback</h2>
          {general ? <p className="details-text">{general}</p> : <p className="details-text muted">Sem resumo geral.</p>}
          <div className="details-accordion">
            <details>
              <summary>Pontos fortes</summary>
              <ul>
                {(Array.isArray(pontosFortes) ? pontosFortes : [pontosFortes]).filter(Boolean).map((entry: string, idx: number) => (
                  <li key={`pf-${idx}`}>{entry}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Pontos a melhorar</summary>
              <ul>
                {(Array.isArray(pontosMelhorar) ? pontosMelhorar : [pontosMelhorar]).filter(Boolean).map((entry: string, idx: number) => (
                  <li key={`pm-${idx}`}>{entry}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Sugestões práticas</summary>
              <ul>
                {(Array.isArray(sugestoes) ? sugestoes : [sugestoes]).filter(Boolean).map((entry: string, idx: number) => (
                  <li key={`sp-${idx}`}>{entry}</li>
                ))}
              </ul>
            </details>
          </div>
          <JsonViewer data={result} />
        </section>
      ) : null}

      {essayId ? (
        <section className="details-section">
          <h2>Arquivo enviado</h2>
          {fileLoading && !fileUrl ? <p className="details-text muted">Carregando arquivo...</p> : null}
          {fileError && !fileUrl ? (
            <div className="history-state error">
              <p>{fileError}</p>
              <button type="button" onClick={() => void refreshFileUrl()}>Tentar novamente</button>
            </div>
          ) : null}
          {fileUrl ? (
            <div className="details-file">
              {fileIsPdf ? (
                <iframe src={fileUrl} title="Arquivo enviado" />
              ) : (
                <img src={fileUrl} alt="Redação enviada" loading="lazy" />
              )}
              <a href={fileUrl} target="_blank" rel="noreferrer">Abrir original</a>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="details-section">
        <h2>Review</h2>
        {hasOcrError ? (
          <p className="details-text muted">Não há avaliação para tentativas com erro de OCR.</p>
        ) : item?.review ? (
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
