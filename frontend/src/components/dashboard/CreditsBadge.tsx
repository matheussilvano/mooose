interface CreditsBadgeProps {
  credits: number | null;
}

export default function CreditsBadge({ credits }: CreditsBadgeProps) {
  return (
    <div className="dashboard-credits">
      <span className="dashboard-credits-label">Créditos avulsos</span>
      <span className="dashboard-credits-value">{credits ?? "—"}</span>
    </div>
  );
}
