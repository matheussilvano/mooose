interface HistorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HistorySearch({ value, onChange }: HistorySearchProps) {
  return (
    <div className="history-search">
      <input
        type="search"
        placeholder="Buscar por tema ou trecho"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Buscar correções"
      />
    </div>
  );
}
