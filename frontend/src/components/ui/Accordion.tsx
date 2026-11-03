import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

interface AccordionItem {
  title: string;
  content: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.title} className="rounded-xl border border-border bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-text"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              {item.title}
              <ChevronDown className={cn("h-5 w-5 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-text-muted">{item.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
