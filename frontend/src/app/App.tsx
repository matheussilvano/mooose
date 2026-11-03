import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import EditorPage from "../pages/EditorPage";
import GraderPage from "../pages/GraderPage";
import ConfirmPage from "../pages/ConfirmPage";
import SobrePage from "../pages/SobrePage";
import ComoFuncionaPage from "../pages/ComoFuncionaPage";
import PrivacidadePage from "../pages/PrivacidadePage";
import TermosPage from "../pages/TermosPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import AdminPage from "../pages/AdminPage";
import BlogIndexPage from "../pages/BlogIndexPage";
import BlogPostPage from "../pages/BlogPostPage";
import CorrectionsHistoryPage from "../pages/CorrectionsHistoryPage";
import CorrectionDetailsPage from "../pages/CorrectionDetailsPage";
import NotFoundPage from "../pages/NotFoundPage";
import ScrollToTop from "../components/ScrollToTop";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/corrigir" element={<GraderPage />} />
        <Route path="/aberto" element={<Navigate to="/corrigir" replace />} />
        <Route path="/paywall" element={<Navigate to="/corrigir" replace />} />
        <Route path="/auth/confirmed" element={<ConfirmPage />} />

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
        <Route path="/historico" element={<CorrectionsHistoryPage />} />
        <Route path="/historico/:id" element={<CorrectionDetailsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
