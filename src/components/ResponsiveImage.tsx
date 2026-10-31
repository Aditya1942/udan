import type { Photo } from '../content/business';
import { DEFAULT_WIDTHS, photoSrcSet, photoUrl } from '../lib/images';

type ResponsiveImageProps = {
  photo: Photo;
  /** `sizes` attribute, e.g. "(min-width: 64em) 33vw, 100vw". Defaults to 100vw. */
  sizes?: string;
  /** Candidate widths for srcset. */
  widths?: readonly number[];
  /** Above-the-fold hero: eager load + high fetch priority. Default false (lazy). */
  priority?: boolean;
  /** Override alt (e.g. "" when purely decorative). Defaults to photo.alt. */
  alt?: string;
  className?: string;
};

export function ResponsiveImage({
  photo,
  sizes = '100vw',
  widths = DEFAULT_WIDTHS,
  priority = false,
  alt,
  className,
}: ResponsiveImageProps) {
  const fallbackWidth = widths[Math.min(2, widths.length - 1)] ?? 1080;
  return (
    <img
      src={photoUrl(photo, fallbackWidth)}
      srcSet={photoSrcSet(photo, widths)}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={alt ?? photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={className}
    />
  );
}
