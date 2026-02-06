import { ChevronRight } from "lucide-react";
import ScoreBadge from "./ScoreBadge";
import { formatDatePt } from "../../services/enemHistorico";

interface CorrectionCardProps {
  tema: string;
  createdAt?: string;
  score?: number | null;
  imageUrl?: string;
  onOpen: () => void;
}

export default function CorrectionCard({ tema, createdAt, score, imageUrl, onOpen }: CorrectionCardProps) {
  return (
    <button type="button" className="history-card" onClick={onOpen}>
      {imageUrl ? (
        <div className="history-thumb">
          <img src={imageUrl} alt="Miniatura da redação" loading="lazy" />
        </div>
      ) : null}
      <div className="history-info">
        <p className="history-title">{tema}</p>
        <span className="history-date">{formatDatePt(createdAt)}</span>
      </div>
      <div className="history-right">
        <ScoreBadge score={score} />
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </button>
  );
}
