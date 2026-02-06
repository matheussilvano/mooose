import { getScoreTone } from "../../services/enemHistorico";

interface CompetencyScoreRowProps {
  label: string;
  score: number | null | undefined;
}

export default function CompetencyScoreRow({ label, score }: CompetencyScoreRowProps) {
  const value = typeof score === "number" ? score : 0;
  const tone = getScoreTone(value * 5);
  const percent = Math.min(100, Math.round((value / 200) * 100));

  return (
    <div className="competency-row">
      <div className="competency-row-head">
        <span>{label}</span>
        <strong>{score ?? "—"}</strong>
      </div>
      <div className={`competency-bar ${tone}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
