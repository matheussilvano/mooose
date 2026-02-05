import { useCallback, useRef } from "react";
import { initApp } from "../../legacy/app";

export default function useLegacyApp() {
  const initialized = useRef(false);

  return useCallback(() => {
    if (initialized.current) return;
    initApp();
    initialized.current = true;
  }, []);
}
