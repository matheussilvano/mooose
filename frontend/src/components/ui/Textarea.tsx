import { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export default function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text shadow-sm transition focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
      {...props}
    />
  );
}
