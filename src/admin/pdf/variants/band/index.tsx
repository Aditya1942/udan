/** "Brand band": modern, colour-led family — full-bleed teal header band, rounded cards, a hero balance. */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const band: VariantFamily = {
  id: 'band',
  name: 'Brand band',
  tagline: 'Full-bleed teal band, rounded cards and a big hero balance: the brand, loud and modern.',
  Invoice,
  AdminInvoice,
  Voucher,
};
