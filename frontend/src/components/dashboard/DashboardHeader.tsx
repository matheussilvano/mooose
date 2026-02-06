import { Gift, Plus, Flame, Trophy } from "lucide-react";
import Logo from "../Logo";
import CreditsBadge from "./CreditsBadge";

interface DashboardHeaderProps {
  credits: number | null;
  streak?: number;
  onCredits: () => void;
  onStreak?: () => void;
  onBonus?: () => void;
  onRanking?: () => void;
}

export default function DashboardHeader({ credits, streak = 0, onCredits, onStreak, onBonus, onRanking }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-inner">
        <Logo size="sm" />
        <CreditsBadge credits={credits} />
        <div className="dashboard-header-actions">
          <button type="button" className="dashboard-icon-btn" aria-label="Comprar créditos" onClick={onCredits}>
            <Plus size={16} />
          </button>
          <button type="button" className="dashboard-icon-btn disabled" aria-label="Ofensiva em breve" onClick={onStreak}>
            <Flame size={16} />
            <span className="dashboard-icon-pill">{streak}</span>
          </button>
          <button type="button" className="dashboard-icon-btn disabled" aria-label="Bônus em breve" onClick={onBonus}>
            <Gift size={16} />
          </button>
          <button type="button" className="dashboard-icon-btn disabled" aria-label="Ranking em breve" onClick={onRanking}>
            <Trophy size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
