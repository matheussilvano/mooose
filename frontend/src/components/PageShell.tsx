import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface PageShellProps {
  children: ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        links={[
          { label: "Blog", href: "/blog" },
          { label: "Como funciona", href: "/como-funciona" },
          { label: "Sobre", href: "/sobre" }
        ]}
        ctaLabel="Corrigir redação"
        ctaHref="/editor"
      />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
