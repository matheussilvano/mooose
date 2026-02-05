import { ArrowRight } from "lucide-react";

interface CorrectionItemProps {
  title: string;
  date: string;
  score: number | string;
  onOpen: () => void;
}

export default function CorrectionItem({ title, date, score, onOpen }: CorrectionItemProps) {
  return (
    <button type="button" className="dashboard-correction-item" onClick={onOpen}>
      <div>
        <p className="dashboard-correction-title">{title}</p>
        <span className="dashboard-correction-date">{date}</span>
      </div>
      <div className="dashboard-correction-right">
        <span className="dashboard-correction-score">{score}</span>
        <ArrowRight size={16} />
      </div>
    </button>
  );
}
