import { Check } from "lucide-react";

const chips = ["Sugestões claras", "Correção em minutos", "Notas por competência"];

export default function BenefitsChips() {
  return (
    <div className="landing-chips" aria-label="Benefícios principais">
      {chips.map((label) => (
        <div key={label} className="landing-chip">
          <span className="landing-chip-icon" aria-hidden="true">
            <Check size={14} />
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
