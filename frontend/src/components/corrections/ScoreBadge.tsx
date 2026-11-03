import { getScoreLabel, getScoreTone } from "../../services/enemHistorico";
import { normalizeScore } from "../../lib/normalize";

interface ScoreBadgeProps {
  score: number | null | undefined;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const value = normalizeScore(score);
  if (value === null) {
    return (
      <div className="score-badge neutral">
        <span>—</span>
        <small>Sem nota</small>
      </div>
    );
  }

  const tone = getScoreTone(value);
  const label = getScoreLabel(value);

  return (
    <div className={`score-badge ${tone}`}>
      <span>{Math.round(value)}</span>
      <small>{label}</small>
    </div>
  );
}
