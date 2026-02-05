import { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
}

export default function Section({ title, subtitle, className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn("px-4 py-12 md:px-6 lg:px-8", className)}
      {...props}
    >
      <div className="mx-auto w-full max-w-6xl">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h2 className="text-2xl font-bold text-text md:text-3xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-text-muted md:text-base">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
