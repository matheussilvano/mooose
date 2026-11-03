import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Analytics and ads are opt-in: forks and self-hosters ship without any tracking by default.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const gaId = env.VITE_GA_ID;
  const adsenseId = env.VITE_ADSENSE_CLIENT;
  return {
    plugins: [
      react(),
      {
        name: "optional-third-party-scripts",
        transformIndexHtml() {
          const tags: any[] = [];
          if (adsenseId) {
            tags.push({
              tag: "script",
              attrs: { async: true, crossorigin: "anonymous", src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}` },
              injectTo: "head"
            });
          }
          if (gaId) {
            tags.push({ tag: "script", attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${gaId}` }, injectTo: "head" });
            tags.push({
              tag: "script",
              children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
              injectTo: "head"
            });
          }
          return tags;
        }
      }
    ],
    server: { port: 5173 }
  };
});
