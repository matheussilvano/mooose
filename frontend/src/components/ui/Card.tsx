import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-soft",
        className
      )}
      {...props}
    />
  );
}
