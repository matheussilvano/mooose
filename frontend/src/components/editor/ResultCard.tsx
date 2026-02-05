import { marked } from "marked";
import Card from "../ui/Card";
import ReviewWidget from "./ReviewWidget";
import { CorrectionResult } from "../../features/editor/useEditor";

interface ResultCardProps {
  result: CorrectionResult | null;
  essayId?: number | null;
  initialReview?: { stars?: number; comment?: string } | null;
  onSaveReview: (essayId: number, stars: number, comment: string) => Promise<void>;
}

export default function ResultCard({ result, essayId, initialReview, onSaveReview }: ResultCardProps) {
  if (!result) {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold">Resultado</h3>
        <p className="mt-2 text-sm text-text-muted">O resultado detalhado da sua última correção aparece aqui.</p>
        <div className="mt-4 text-center text-sm text-text-muted">
          Seu resultado vai aparecer aqui assim que você enviar uma redação.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Resultado</h3>
      <div className="mt-4 text-center">
        <span className="text-xs text-text-muted">NOTA FINAL</span>
        <div className="mt-2 inline-flex items-center justify-center rounded-full bg-brand/10 px-4 py-2 text-2xl font-bold text-brand">
          {result.nota_final}
        </div>
      </div>
      <div className="mt-4 text-sm text-text" dangerouslySetInnerHTML={{ __html: marked.parse(result.analise_geral || result.feedback_geral || result.feedback || "") }} />
      <h4 className="mt-4 text-sm font-semibold">Detalhamento por competência</h4>
      <div className="mt-3 space-y-3">
        {(result.competencias || []).map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-text">
              <span>Competência {c.id}</span>
              <span className="rounded-full bg-brand/10 px-2 py-1 text-brand">{c.nota} / 200</span>
            </div>
            {c.feedback && (
              <div className="mt-2 text-xs text-text" dangerouslySetInnerHTML={{ __html: marked.parse(c.feedback) }} />
            )}
          </div>
        ))}
      </div>
      {essayId ? (
        <ReviewWidget
          essayId={essayId}
          initialStars={initialReview?.stars || 0}
          initialComment={initialReview?.comment || ""}
          onSave={(stars, comment) => onSaveReview(essayId, stars, comment)}
        />
      ) : null}
    </Card>
  );
}
