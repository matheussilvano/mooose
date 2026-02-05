import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export default function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-4 w-full animate-pulse rounded-full bg-slate-200", className)}
      {...props}
    />
  );
}
