interface CreditsBadgeProps {
  credits: number | null;
}

export default function CreditsBadge({ credits }: CreditsBadgeProps) {
  return (
    <div className="dashboard-credits">
      <span className="dashboard-credits-label">Correções disponíveis</span>
      <span className="dashboard-credits-value">{credits ?? "—"}</span>
    </div>
  );
}
