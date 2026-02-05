import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./ui/Button";
import { cn } from "../lib/cn";
import Logo from "./Logo";

const defaultLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Benefícios", href: "#beneficios" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" }
];

interface HeaderProps {
  links?: Array<{ label: string; href: string }>;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}

export default function Header({ links = defaultLinks, ctaLabel = "Começar", ctaHref = "/editor", className }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("topbar sticky top-0 z-40 w-full border-b border-border/60 bg-white/80 backdrop-blur", className)}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
        <a href="/" aria-label="Mooose">
          <Logo size="md" />
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-text md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-brand">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex">
          <Button className="rounded-full" onClick={() => (window.location.href = ctaHref)}>
            {ctaLabel}
          </Button>
        </div>
        <button
          type="button"
          className="flex items-center rounded-full border border-border bg-white p-2 text-text md:hidden"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-slate-950/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute right-0 top-0 h-full w-80 max-w-[90%] bg-white p-6"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <Logo size="md" />
                <button
                  type="button"
                  className="rounded-full bg-slate-100 p-2"
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-8 flex flex-col gap-4 text-base font-semibold">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={cn("text-text transition hover:text-brand")}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="mt-8">
                <Button full onClick={() => (window.location.href = ctaHref)}>
                  {ctaLabel}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
