import { Helmet } from "react-helmet-async";
import LegacyHtml from "../components/LegacyHtml";
import useLegacyAdmin from "../features/admin/useLegacyAdmin";

export default function AdminPage() {
  const onReady = useLegacyAdmin();

  return (
    <>
      <Helmet>
        <title>Mooose · Painel Admin</title>
      </Helmet>
      <LegacyHtml src="/legacy/admin.html" onReady={onReady} />
    </>
  );
}
