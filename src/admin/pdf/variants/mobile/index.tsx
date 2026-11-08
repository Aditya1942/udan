/** "Phone-first": narrow 360×720 pt pages read at full size on WhatsApp — one hero fact, then stacked cards. */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const mobile: VariantFamily = {
  id: 'mobile',
  name: 'Phone-first',
  tagline: 'Phone-screen pages for WhatsApp: the one fact that matters as a hero card, then stacked tap-sized cards.',
  Invoice,
  AdminInvoice,
  Voucher,
};
