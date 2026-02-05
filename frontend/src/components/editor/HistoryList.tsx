import Card from "../ui/Card";
import Button from "../ui/Button";

interface HistoryListProps {
  items: any[];
  onOpen: (item: any) => void;
}

export default function HistoryList({ items, onOpen }: HistoryListProps) {
  if (!items.length) {
    return (
      <Card className="p-6 text-center text-sm text-text-muted">
        Você ainda não tem histórico. Faça sua primeira correção para começar a acompanhar sua evolução.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">{item.tema || "Sem tema"}</p>
              <p className="text-xs text-text-muted">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</p>
            </div>
            <div className="text-lg font-bold text-brand">{item.nota_final || "—"}</div>
          </div>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => onOpen(item)}>
            Ver detalhes
          </Button>
        </Card>
      ))}
    </div>
  );
}
