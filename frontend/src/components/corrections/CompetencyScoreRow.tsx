import { getScoreTone } from "../../services/enemHistorico";
import { normalizeScore } from "../../lib/normalize";

interface CompetencyScoreRowProps {
  label: string;
  score: number | null | undefined;
}

export default function CompetencyScoreRow({ label, score }: CompetencyScoreRowProps) {
  const value = normalizeScore(score);
  const normalized = value ?? 0;
  const tone = getScoreTone(normalized * 5);
  const percent = value === null ? 0 : Math.min(100, Math.round((normalized / 200) * 100));

  return (
    <div className="competency-row">
      <div className="competency-row-head">
        <span>{label}</span>
        <strong>{value ?? "—"}</strong>
      </div>
      <div className={`competency-bar ${tone}`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
