import { useEffect } from "react";

/**
 * Lightweight SEO hook — updates document title, meta description,
 * Open Graph, Twitter, and canonical URL per page.
 */
export function useSEO({ title, description, path = "", image = "/logo.jpg", type = "website", jsonLd } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | IndiFunded` : "IndiFunded — India's 1st Prop Trading Firm";
    const desc = description || "Pass the IndiFunded challenge, get a funded trading account up to ₹5,00,000 and keep 70% of profits.";
    const url = `https://www.indifunded.com${path}`;
    const fullImage = image.startsWith("http") ? image : `https://www.indifunded.com${image}`;

    document.title = fullTitle;

    const setMeta = (selector, attr, value) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = selector.match(/\[([^=]+)="([^"]+)"\]/).slice(1);
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", fullImage);
    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="twitter:title"]', "content", fullTitle);
    setMeta('meta[property="twitter:description"]', "content", desc);
    setMeta('meta[property="twitter:url"]', "content", url);
    setMeta('meta[property="twitter:image"]', "content", fullImage);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // JSON-LD structured data per page
    let scriptEl = document.head.querySelector('script[data-page-jsonld="true"]');
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.type = "application/ld+json";
        scriptEl.setAttribute("data-page-jsonld", "true");
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, path, image, type, JSON.stringify(jsonLd || {})]);
}
