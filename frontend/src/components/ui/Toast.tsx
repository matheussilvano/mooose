import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../lib/cn";

interface ToastItem {
  id: string;
  message: string;
  tone?: "success" | "error";
}

interface ToastContextValue {
  push: (message: string, tone?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-soft",
                item.tone === "error" ? "bg-danger text-white" : "bg-brand text-white"
              )}
            >
              {item.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
