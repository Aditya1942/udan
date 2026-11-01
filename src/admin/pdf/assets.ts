/** Browser asset URLs for the PDF chunk: static TTFs (Inter 400/600, Manrope 600/700) and the wordmark. */
import wordmark from '../../assets/brand/udan-wordmark.png';
import interRegular from './fonts/Inter-Regular.ttf?url';
import interSemiBold from './fonts/Inter-SemiBold.ttf?url';
import manropeBold from './fonts/Manrope-Bold.ttf?url';
import manropeSemiBold from './fonts/Manrope-SemiBold.ttf?url';
import type { PdfAssets } from './theme';

export const BROWSER_ASSETS: PdfAssets = { fonts: { interRegular, interSemiBold, manropeSemiBold, manropeBold }, wordmark };
