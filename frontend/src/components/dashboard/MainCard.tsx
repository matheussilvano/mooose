import { ArrowUpRight } from "lucide-react";
import Button from "../ui/Button";

interface MainCardProps {
  title: string;
  subtitle: string;
  badge?: string;
  onPrimary: () => void;
}

export default function MainCard({ title, subtitle, badge, onPrimary }: MainCardProps) {
  return (
    <div className="dashboard-main-card">
      <div className="dashboard-main-info">
        {badge && <span className="dashboard-main-badge">{badge}</span>}
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <Button size="md" onClick={onPrimary}>
          Continuar
          <ArrowUpRight size={16} />
        </Button>
      </div>
      <div className="dashboard-main-thumb" aria-hidden="true">
        <div className="thumb-card">
          <div className="thumb-line" />
          <div className="thumb-line short" />
          <div className="thumb-bar" />
        </div>
      </div>
    </div>
  );
}
