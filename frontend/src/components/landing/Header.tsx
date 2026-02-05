import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../Logo";
import Button from "../ui/Button";
import { cn } from "../../lib/cn";

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" }
];

interface LandingHeaderProps {
  className?: string;
}

export default function LandingHeader({ className }: LandingHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={cn("landing-header", className)}>
      <div className="landing-header-inner">
        <a href="/" aria-label="Mooose">
          <Logo size="md" />
        </a>

        <nav className="landing-nav">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="landing-actions">
          <a href="/editor?signup=1" className="landing-link">Cadastre-se</a>
          <Button size="sm" onClick={() => (window.location.href = "/editor?login=1")}>
            Fazer login
          </Button>
        </div>

        <button
          type="button"
          className="landing-menu-btn"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="landing-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="landing-drawer-panel"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="landing-drawer-header">
                <Logo size="md" />
                <button
                  type="button"
                  className="landing-drawer-close"
                  aria-label="Fechar menu"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="landing-drawer-links">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="landing-drawer-link"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="landing-drawer-actions">
                <a href="/editor?signup=1" className="landing-link">Cadastre-se</a>
                <Button full onClick={() => (window.location.href = "/editor?login=1")}>
                  Fazer login
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
