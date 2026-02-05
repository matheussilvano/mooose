import { useEffect, useState } from "react";

interface LegacyHtmlProps {
  src: string;
  className?: string;
  onReady?: () => void;
}

export default function LegacyHtml({ src, className, onReady }: LegacyHtmlProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("failed_to_load_legacy_html");
        return res.text();
      })
      .then((text) => {
        if (isMounted) setHtml(text);
      })
      .catch(() => {
        if (isMounted) setHtml("<div class=\"card\"><p>Conteúdo indisponível.</p></div>");
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  useEffect(() => {
    if (!html || !onReady) return;
    const id = window.requestAnimationFrame(() => onReady());
    return () => window.cancelAnimationFrame(id);
  }, [html, onReady]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
