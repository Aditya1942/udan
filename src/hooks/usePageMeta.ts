import { useEffect } from 'react';
import { business } from '../content/business';

type PageMeta = {
  /** Page title without the brand suffix, e.g. "Visa Services". Omit on the homepage. */
  title?: string;
  description: string;
};

/** Finds (or creates) a <meta> tag by `name` or `property` and sets its content. */
function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/** Sets document.title ("<title> | UDAN Immigration & Tours"), the meta description and the Open Graph title/description. */
export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${business.name}` : `${business.name} | Tours, Visa & Travel Services in Ahmedabad`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
  }, [title, description]);
}
