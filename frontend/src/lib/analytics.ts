declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}
