import type { Photo } from '../content/business';

export const DEFAULT_WIDTHS = [480, 768, 1080, 1440, 1920] as const;

/** Unsplash CDN URL cropped to the photo's aspect ratio at the given width. */
export function photoUrl(photo: Photo, width: number, quality = 70): string {
  const height = Math.round((width * photo.height) / photo.width);
  const params = new URLSearchParams({
    w: String(width),
    h: String(height),
    q: String(quality),
    auto: 'format',
    fit: 'crop',
  });
  return `${photo.src}?${params.toString()}`;
}

export function photoSrcSet(photo: Photo, widths: readonly number[] = DEFAULT_WIDTHS): string {
  return widths.map((w) => `${photoUrl(photo, w)} ${w}w`).join(', ');
}
