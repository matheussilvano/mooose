import Skeleton from "../ui/Skeleton";
import CorrectionItem from "./CorrectionItem";

interface RecentCorrectionsProps {
  items: Array<{ id: number; tema?: string; created_at?: string; nota_final?: number }>;
  loading?: boolean;
  onOpen: (item: any) => void;
  onViewAll?: () => void;
}

export default function RecentCorrections({ items, loading, onOpen, onViewAll }: RecentCorrectionsProps) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-header">
        <h3>Últimas correções</h3>
        {onViewAll && (
          <button type="button" className="dashboard-link" onClick={onViewAll}>Ver tudo</button>
        )}
      </div>

      {loading && !items.length ? (
        <div className="dashboard-card">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-5 h-10 w-full" />
        </div>
      ) : null}

      {!loading && !items.length ? (
        <div className="dashboard-card empty">
          <p>Você ainda não enviou redações.</p>
          <button className="dashboard-cta" type="button" onClick={onViewAll}>Começar agora</button>
        </div>
      ) : null}

      {items.length ? (
        <div className="dashboard-list">
          {items.slice(0, 4).map((item) => (
            <CorrectionItem
              key={item.id}
              title={item.tema || "Sem tema"}
              date={item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
              score={item.nota_final ?? "—"}
              onOpen={() => onOpen(item)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
