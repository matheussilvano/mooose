import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export default function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand",
        className
      )}
      {...props}
    />
  );
}
