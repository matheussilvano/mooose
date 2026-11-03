import DOMPurify from "dompurify";

export interface ParsedHtml {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  content: string;
}

export function parseHtmlDocument(html: string): ParsedHtml {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector("title")?.textContent?.trim() || "Mooose · Blog";
  const description =
    doc.querySelector("meta[name='description']")?.getAttribute("content")?.trim() ||
    "";
  const ogTitle =
    doc.querySelector("meta[property='og:title']")?.getAttribute("content")?.trim() || title;
  const ogDescription =
    doc.querySelector("meta[property='og:description']")?.getAttribute("content")?.trim() || description;
  const ogImage =
    doc.querySelector("meta[property='og:image']")?.getAttribute("content")?.trim() || "/logo.png";
  const twitterTitle =
    doc.querySelector("meta[name='twitter:title']")?.getAttribute("content")?.trim() || ogTitle;
  const twitterDescription =
    doc.querySelector("meta[name='twitter:description']")?.getAttribute("content")?.trim() || ogDescription;

  const rawBody = doc.body?.innerHTML || "";
  const normalizedBody = rawBody.replace(/(src|href)=\"([^\"]+)\"/gi, (match, attr, value) => {
    if (
      value.startsWith("/") ||
      value.startsWith("http") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:") ||
      value.startsWith("#") ||
      value.startsWith(".")
    ) {
      return match;
    }
    if (!/\\.(png|jpg|jpeg|svg|webp|gif)$/i.test(value)) return match;
    return `${attr}=\"/${value}\"`;
  });
  const content = DOMPurify.sanitize(normalizedBody, { USE_PROFILES: { html: true } });

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    twitterTitle,
    twitterDescription,
    content
  };
}
