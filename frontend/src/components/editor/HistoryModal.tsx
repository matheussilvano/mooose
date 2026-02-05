import { marked } from "marked";
import Modal from "../ui/Modal";
import { extractHistoryEssayText, extractHistoryResult, normalizeScore } from "../../lib/normalize";
import ReviewWidget from "./ReviewWidget";

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  item: any | null;
  onSaveReview: (essayId: number, stars: number, comment: string) => Promise<void>;
}

export default function HistoryModal({ open, onClose, item, onSaveReview }: HistoryModalProps) {
  if (!item) return null;
  const essayText = extractHistoryEssayText(item);
  const resultado = extractHistoryResult(item);
  const analysis = resultado?.analise_geral || resultado?.feedback_geral || resultado?.feedback || "";
  const score = normalizeScore(item?.nota_final);

  return (
    <Modal open={open} onClose={onClose} title={item.tema || "Redação"}>
      <div className="text-xs text-text-muted">Enviada em {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</div>
      <div className="mt-3 text-sm">
        <strong>Nota:</strong> {score !== null ? Math.round(score) : "—"}
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold">Texto da redação</h4>
        {essayText ? (
          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-border bg-slate-50 p-3 text-xs text-text">
            {essayText}
          </div>
        ) : (
          <p className="mt-2 text-xs text-text-muted">Texto completo não disponível neste histórico.</p>
        )}
      </div>
      <div className="mt-4">
        <h4 className="text-sm font-semibold">Feedback da correção</h4>
        {analysis ? (
          <div className="mt-2 text-xs text-text" dangerouslySetInnerHTML={{ __html: marked.parse(analysis) }} />
        ) : (
          <p className="mt-2 text-xs text-text-muted">Feedback completo não disponível neste histórico.</p>
        )}
      </div>
      <ReviewWidget
        essayId={item.id}
        initialStars={item?.review?.stars || 0}
        initialComment={item?.review?.comment || ""}
        onSave={(stars, comment) => onSaveReview(item.id, stars, comment)}
      />
    </Modal>
  );
}
