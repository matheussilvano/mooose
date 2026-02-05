import { Helmet } from "react-helmet-async";
import LandingHeader from "../components/landing/Header";
import Hero from "../components/landing/Hero";
import ProductPreview from "../components/landing/ProductPreview";
import LandingSections from "../components/landing/Sections";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Helmet>
        <title>Mooose · Corrija sua redação no padrão ENEM</title>
        <meta
          name="description"
          content="Corrija sua redação no padrão ENEM em poucos minutos com nota por competência e feedback claro. Comece grátis com 1 correção e acompanhe sua evolução."
        />
      </Helmet>

      <div className="landing-bg">
        <div className="landing-blob landing-blob-one" aria-hidden="true" />
        <div className="landing-blob landing-blob-two" aria-hidden="true" />
        <div className="landing-blob landing-blob-three" aria-hidden="true" />
      </div>

      <LandingHeader />

      <main className="landing-content">
        <Hero />
        <ProductPreview />
        <LandingSections />
      </main>

      <Footer />
    </div>
  );
}
