import { cn } from "../../lib/cn";

interface Step {
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  activeIndex?: number;
}

export default function Stepper({ steps, activeIndex = 0 }: StepperProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        return (
          <div key={step.title} className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                isActive ? "border-brand bg-brand text-white" : "border-border bg-white text-text"
              )}
            >
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{step.title}</p>
              {step.description && (
                <p className="text-sm text-text-muted">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
