interface HistoryFiltersProps {
  inputType: string;
  reviewStatus: string;
  scoreRange: string;
  onInputType: (value: string) => void;
  onReviewStatus: (value: string) => void;
  onScoreRange: (value: string) => void;
}

const inputOptions = [
  { value: "all", label: "Todos" },
  { value: "texto", label: "Texto" },
  { value: "imagem", label: "Imagem" },
  { value: "pdf", label: "PDF" }
];

const reviewOptions = [
  { value: "all", label: "Todos" },
  { value: "reviewed", label: "Com review" },
  { value: "pending", label: "Sem review" }
];

const scoreOptions = [
  { value: "all", label: "Todas" },
  { value: "0-400", label: "0–400" },
  { value: "401-700", label: "401–700" },
  { value: "701-900", label: "701–900" },
  { value: "901-1000", label: "901–1000" }
];

export default function HistoryFilters({ inputType, reviewStatus, scoreRange, onInputType, onReviewStatus, onScoreRange }: HistoryFiltersProps) {
  return (
    <div className="history-filters">
      <div className="history-filter-row">
        <span>Tipo</span>
        <div className="history-filter-chips">
          {inputOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={inputType === option.value ? "active" : ""}
              onClick={() => onInputType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="history-filter-row">
        <span>Status</span>
        <div className="history-filter-chips">
          {reviewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={reviewStatus === option.value ? "active" : ""}
              onClick={() => onReviewStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="history-filter-row">
        <span>Nota</span>
        <div className="history-filter-chips">
          {scoreOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={scoreRange === option.value ? "active" : ""}
              onClick={() => onScoreRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
