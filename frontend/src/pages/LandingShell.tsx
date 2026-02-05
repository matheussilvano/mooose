import { Outlet } from "react-router-dom";
import LegacyHtml from "../components/LegacyHtml";
import useLegacyApp from "../features/app/useLegacyApp";

export default function LandingShell() {
  const onReady = useLegacyApp();

  return (
    <>
      <LegacyHtml src="/legacy/landing.html" onReady={onReady} />
      <Outlet />
    </>
  );
}
