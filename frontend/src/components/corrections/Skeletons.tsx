import Skeleton from "../ui/Skeleton";

export function HistoryCardSkeleton() {
  return (
    <div className="history-card skeleton">
      <div className="history-thumb" />
      <div className="history-info">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-3 w-1/3" />
      </div>
      <div className="history-right">
        <Skeleton className="h-8 w-14" />
      </div>
    </div>
  );
}

export function HistoryListSkeleton() {
  return (
    <div className="history-list">
      {Array.from({ length: 4 }).map((_, idx) => (
        <HistoryCardSkeleton key={idx} />
      ))}
    </div>
  );
}
