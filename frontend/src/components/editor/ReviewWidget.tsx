import { useState } from "react";
import Button from "../ui/Button";
import ReviewStars from "./ReviewStars";

interface ReviewWidgetProps {
  essayId: number;
  initialStars?: number;
  initialComment?: string;
  onSave: (stars: number, comment: string) => Promise<void>;
}

export default function ReviewWidget({ essayId, initialStars = 0, initialComment = "", onSave }: ReviewWidgetProps) {
  const [stars, setStars] = useState(initialStars);
  const [comment, setComment] = useState(initialComment);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!essayId) return;
    if (stars < 1 || stars > 5) {
      setError(true);
      setMessage("Selecione de 1 a 5 estrelas.");
      return;
    }
    setLoading(true);
    setError(false);
    setMessage(null);
    try {
      await onSave(stars, comment);
      setMessage("Avaliação salva!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(true);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-white p-4">
      <p className="text-sm font-semibold text-text">Avalie esta correção</p>
      <p className="text-xs text-text-muted">Leva menos de 1 minuto.</p>
      <div className="mt-3 flex items-center gap-3">
        <ReviewStars value={stars} onChange={setStars} />
        <Button size="sm" variant="secondary" loading={loading} onClick={handleSave}>
          Salvar avaliação
        </Button>
      </div>
      <textarea
        className="mt-3 min-h-[80px] w-full rounded-xl border border-border px-3 py-2 text-sm"
        placeholder="Comentário (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {message && (
        <p className={`mt-2 text-xs ${error ? "text-danger" : "text-success"}`}>{message}</p>
      )}
    </div>
  );
}
