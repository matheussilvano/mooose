import { Gift, Plus, Flame } from "lucide-react";
import Logo from "../Logo";
import CreditsBadge from "./CreditsBadge";

interface DashboardHeaderProps {
  credits: number | null;
  streak?: number;
  onCredits: () => void;
  onStreak?: () => void;
  onBonus?: () => void;
}

export default function DashboardHeader({ credits, streak = 0, onCredits, onStreak, onBonus }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-inner">
        <Logo size="sm" />
        <CreditsBadge credits={credits} />
        <div className="dashboard-header-actions">
          <button type="button" className="dashboard-icon-btn" aria-label="Comprar créditos" onClick={onCredits}>
            <Plus size={16} />
          </button>
          <button type="button" className="dashboard-icon-btn" aria-label="Ver ofensiva" onClick={onStreak}>
            <Flame size={16} />
            <span className="dashboard-icon-pill">{streak}</span>
          </button>
          <button type="button" className="dashboard-icon-btn" aria-label="Bônus" onClick={onBonus}>
            <Gift size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
