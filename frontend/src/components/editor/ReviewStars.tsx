import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/cn";

interface ReviewStarsProps {
  value?: number;
  onChange?: (value: number) => void;
}

export default function ReviewStars({ value = 0, onChange }: ReviewStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hovered ? star <= hovered : star <= value;
        return (
          <button
            key={star}
            type="button"
            className="rounded-full p-1"
            aria-label={`Avaliar ${star} estrelas`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange?.(star)}
          >
            <Star className={cn("h-4 w-4", filled ? "text-amber-400" : "text-slate-300")} fill={filled ? "currentColor" : "none"} />
          </button>
        );
      })}
    </div>
  );
}
