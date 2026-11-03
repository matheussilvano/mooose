import { useCallback, useEffect, useRef, useState } from "react";

const funnyMessages = [
  "Analisando competências...",
  "Gerando feedback...",
  "Calculando sua nota...",
  "Organizando sugestões...",
  "Revisando coesão e coerência...",
  "Preparando sua devolutiva..."
];

export function useLoadingOverlay() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(funnyMessages[0]);
  const intervalRef = useRef<number | null>(null);

  const show = useCallback((msg?: string) => {
    setVisible(true);
    if (msg) {
      setMessage(msg);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    setMessage(funnyMessages[0]);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    let i = 0;
    intervalRef.current = window.setInterval(() => {
      i = (i + 1) % funnyMessages.length;
      setMessage(funnyMessages[i]);
    }, 2500);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  return { visible, message, show, hide };
}
