import { useEffect } from 'react';
import { business } from '../content/business';

type PageMeta = {
  /** Page title without the brand suffix, e.g. "Visa Services". Omit on the homepage. */
  title?: string;
  description: string;
};

/** Sets document.title ("<title> | UDAN Immigration & Tours") and the meta description. */
export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    document.title = title ? `${title} | ${business.name}` : `${business.name} | Tours, Visa & Travel Services in Ahmedabad`;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
  }, [title, description]);
}
