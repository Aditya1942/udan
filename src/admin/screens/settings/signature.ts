/**
 * Signature upload: a PNG resized in the browser until it is ≤ 100 KB, as a `data:image/png;base64,…` URL
 * (stored in `settings/business`; the rules cap it at 140,000 chars).
 */
import { isValidSignature, SIGNATURE_PREFIX } from '../../model';

export const SIGNATURE_MAX_BYTES = 100 * 1024;
/** Signatures print small; start at this width. */
const START_WIDTH = 600;

export class SignatureError extends Error {}

/** Decoded size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export function fitsSignatureLimits(dataUrl: string): boolean {
  return dataUrl.startsWith(SIGNATURE_PREFIX) && dataUrlBytes(dataUrl) <= SIGNATURE_MAX_BYTES && isValidSignature(dataUrl);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new SignatureError("That file couldn't be read as an image."));
    };
    img.src = url;
  });
}

export async function signatureFromFile(file: File): Promise<string> {
  if (file.type !== 'image/png') throw new SignatureError('Choose a PNG image.');
  const img = await loadImage(file);
  if (!img.naturalWidth || !img.naturalHeight) throw new SignatureError("That file couldn't be read as an image.");
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new SignatureError("This browser can't resize images.");
  let width = Math.min(img.naturalWidth, START_WIDTH);
  for (let attempt = 0; attempt < 10 && width >= 40; attempt += 1) {
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((img.naturalHeight * width) / img.naturalWidth));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    if (fitsSignatureLimits(dataUrl)) return dataUrl;
    width = Math.round(width * 0.75);
  }
  throw new SignatureError("That image is too detailed to shrink under 100 KB. Try a simpler scan or a cropped image.");
}
