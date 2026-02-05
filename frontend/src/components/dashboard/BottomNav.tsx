import { Home, FileText, Clock, ShoppingBag, User } from "lucide-react";

export type DashboardTab = "home" | "new" | "history" | "shop" | "profile";

interface BottomNavProps {
  active: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

const items: Array<{ id: DashboardTab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "new", label: "Redação", icon: FileText },
  { id: "history", label: "Histórico", icon: Clock },
  { id: "shop", label: "Loja", icon: ShoppingBag },
  { id: "profile", label: "Perfil", icon: User }
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="dashboard-bottom-nav" aria-label="Navegação principal">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`dashboard-nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
