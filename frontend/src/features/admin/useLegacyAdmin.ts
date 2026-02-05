import { useCallback, useRef } from "react";
import { initAdmin } from "../../legacy/admin";

export default function useLegacyAdmin() {
  const initialized = useRef(false);

  return useCallback(() => {
    if (initialized.current) return;
    initAdmin();
    initialized.current = true;
  }, []);
}
