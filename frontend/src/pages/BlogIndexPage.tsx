import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { parseHtmlDocument, ParsedHtml } from "../lib/blog";

const fallbackMeta: ParsedHtml = {
  title: "Mooose · Blog",
  description: "Dicas e conteúdos sobre redação do ENEM.",
  ogTitle: "Mooose · Blog",
  ogDescription: "Dicas e conteúdos sobre redação do ENEM.",
  ogImage: "/logo.png",
  twitterTitle: "Mooose · Blog",
  twitterDescription: "Dicas e conteúdos sobre redação do ENEM.",
  content: ""
};

export default function BlogIndexPage() {
  const [data, setData] = useState<ParsedHtml>(fallbackMeta);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/blog/index.html")
      .then((res) => {
        if (!res.ok) throw new Error("blog_index_unavailable");
        return res.text();
      })
      .then((html) => {
        if (!isMounted) return;
        setData(parseHtmlDocument(html));
      })
      .catch(() => {
        if (!isMounted) return;
        setData(fallbackMeta);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);


  return (
    <div className="blog-shell">
      <Helmet>
        <title>{data.title}</title>
        <meta name="description" content={data.description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={data.ogTitle} />
        <meta property="og:description" content={data.ogDescription} />
        <meta property="og:image" content={data.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={data.twitterTitle} />
        <meta name="twitter:description" content={data.twitterDescription} />
      </Helmet>

      {isLoading ? (
        <div className="blog-loading">Carregando conteúdo do blog...</div>
      ) : (
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: data.content }} />
      )}
    </div>
  );
}
