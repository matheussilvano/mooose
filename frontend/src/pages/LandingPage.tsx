import { Helmet } from "react-helmet-async";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "É gratuito?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Você começa com 1 correção grátis. Depois, pode comprar correções para continuar."
      }
    },
    {
      "@type": "Question",
      "name": "Recebo nota no padrão ENEM?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. A correção segue o modelo por competências (C1–C5)."
      }
    },
    {
      "@type": "Question",
      "name": "Posso enviar por foto ou PDF?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim. Você pode enviar texto digitado ou arquivo."
      }
    },
    {
      "@type": "Question",
      "name": "Quanto custa?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "O pacote mais popular é 10 correções por R$ 9,90."
      }
    }
  ]
};

export default function LandingPage() {
  return (
    <Helmet>
      <title>Mooose · Corrija sua redação no padrão ENEM</title>
      <meta
        name="description"
        content="Corrija sua redação no padrão ENEM em poucos minutos com nota por competência e feedback claro. Comece grátis com 1 correção e acompanhe sua evolução."
      />
      <meta property="og:type" content="website" />
      <meta
        property="og:title"
        content="Corrija sua redação no padrão ENEM em poucos minutos"
      />
      <meta
        property="og:description"
        content="Nota por competência + feedback claro do que melhorar. Comece grátis com 1 correção e acompanhe sua evolução."
      />
      <meta property="og:url" content="https://www.mooose.com.br/" />
      <meta property="og:image" content="https://www.mooose.com.br/logo.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Corrija sua redação no padrão ENEM em poucos minutos"
      />
      <meta
        name="twitter:description"
        content="Nota por competência + feedback claro do que melhorar. Comece grátis com 1 correção e acompanhe sua evolução."
      />
      <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
    </Helmet>
  );
}
