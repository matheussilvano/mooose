import { ReactNode } from "react";
import SiteNav from "./site/SiteNav";
import SiteFooter from "./site/SiteFooter";

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mz">
      <SiteNav />
      <main className="mz-wrap mz-prose-wrap">{children}</main>
      <SiteFooter />
    </div>
  );
}
