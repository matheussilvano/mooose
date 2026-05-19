import { ChevronRight } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import { formatDatePt, getSignedUrlKind } from "../../services/enemHistorico";
import { useEssayArquivoUrl } from "../../features/editor/useEssayArquivoUrl";

interface CorrectionCardProps {
  tema: string;
  createdAt?: string;
  score?: number | null;
  essayId?: number | null;
  isOcrError?: boolean;
  onOpen: () => void;
}

export default function CorrectionCard({ tema, createdAt, score, essayId, isOcrError, onOpen }: CorrectionCardProps) {
  const { url } = useEssayArquivoUrl(essayId, { enabled: Boolean(essayId) });
  const thumbKind = getSignedUrlKind(url);
  const showThumb = Boolean(url && thumbKind === "image");

  return (
    <button type="button" className="history-card" onClick={onOpen}>
      {showThumb ? (
        <div className="history-thumb">
          <img src={url || ""} alt="Miniatura da redação" loading="lazy" />
        </div>
      ) : null}
      <div className="history-info">
        <p className="history-title">{tema}</p>
        <span className="history-date">{formatDatePt(createdAt)}</span>
      </div>
      <div className="history-right">
        {isOcrError ? <span className="history-ocr-badge">Erro OCR</span> : <ScoreBadge score={score} />}
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </button>
  );
}
