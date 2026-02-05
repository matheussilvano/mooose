import { Helmet } from "react-helmet-async";
import LegacyHtml from "./LegacyHtml";
import useLegacyApp from "../features/app/useLegacyApp";

interface StaticLegacyPageProps {
  src: string;
  title: string;
  description: string;
  ogUrl: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  withLegacyApp?: boolean;
}

export default function StaticLegacyPage({
  src,
  title,
  description,
  ogUrl,
  ogImage = "logo.png",
  twitterTitle,
  twitterDescription,
  withLegacyApp = true
}: StaticLegacyPageProps) {
  const onReady = useLegacyApp();
  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={twitterTitle || title} />
        <meta name="twitter:description" content={twitterDescription || description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <LegacyHtml src={src} onReady={withLegacyApp ? onReady : undefined} />
    </>
  );
}
