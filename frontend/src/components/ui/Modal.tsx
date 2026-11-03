import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div
        className={cn("relative w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-modal", className)}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Modal"}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
        {title && <h3 className="text-lg font-semibold text-text">{title}</h3>}
        <div className="mt-3 text-sm text-text-muted">{children}</div>
      </div>
    </div>,
    document.body
  );
}
