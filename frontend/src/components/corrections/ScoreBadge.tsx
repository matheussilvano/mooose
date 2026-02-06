import { getScoreLabel, getScoreTone } from "../../services/enemHistorico";

interface ScoreBadgeProps {
  score: number | null | undefined;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const value = typeof score === "number" ? score : 0;
  const tone = getScoreTone(value);
  const label = getScoreLabel(value);

  return (
    <div className={`score-badge ${tone}`}>
      <span>{score ?? "—"}</span>
      <small>{label}</small>
    </div>
  );
}
