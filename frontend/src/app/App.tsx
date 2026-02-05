import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import EditorPage from "../pages/EditorPage";
import PaywallPage from "../pages/PaywallPage";
import PaywallSuccessPage from "../pages/PaywallSuccessPage";
import ConfirmPage from "../pages/ConfirmPage";
import LandingShell from "../pages/LandingShell";
import SobrePage from "../pages/SobrePage";
import ComoFuncionaPage from "../pages/ComoFuncionaPage";
import PrivacidadePage from "../pages/PrivacidadePage";
import TermosPage from "../pages/TermosPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import AdminPage from "../pages/AdminPage";
import BlogIndexPage from "../pages/BlogIndexPage";
import BlogPostPage from "../pages/BlogPostPage";
import NotFoundPage from "../pages/NotFoundPage";
import ScrollToTop from "../components/ScrollToTop";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<LandingShell />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/paywall" element={<PaywallPage />} />
          <Route path="/auth/confirmed" element={<ConfirmPage />} />
        </Route>

        <Route path="/paywall/sucesso" element={<PaywallSuccessPage />} />
        <Route path="/paywall/sucesso.html" element={<PaywallSuccessPage />} />

        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/sobre.html" element={<SobrePage />} />
        <Route path="/como-funciona" element={<ComoFuncionaPage />} />
        <Route path="/como-funciona.html" element={<ComoFuncionaPage />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/privacidade.html" element={<PrivacidadePage />} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/termos.html" element={<TermosPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password.html" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email.html" element={<VerifyEmailPage />} />

        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin.html" element={<AdminPage />} />

        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/" element={<Navigate to="/blog" replace />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
