import { DEVICE_FP_KEY } from "./storage";

export function getDeviceFingerprint() {
  try {
    let fp = localStorage.getItem(DEVICE_FP_KEY);
    if (!fp) {
      fp = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_FP_KEY, fp);
    }
    return fp;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
