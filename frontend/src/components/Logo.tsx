import { cn } from "../lib/cn";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl"
};

export default function Logo({ className, size = "md" }: LogoProps) {
  return (
    <span className={cn("font-extrabold tracking-[0.28em] text-brand", sizeMap[size], className)}>
      M
      <span className="text-brand-dark">O</span>
      <span className="text-brand-dark">O</span>
      <span className="text-brand-dark">O</span>
      SE
    </span>
  );
}
