/** "Premium" — luxury travel stationery for high-value packages (honeymoons, international). */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const premium: VariantFamily = {
  id: 'premium',
  name: 'Premium — Travel stationery',
  tagline: 'Editorial luxury: centred mark, serif titles, gold hairlines and a day-by-day voucher for high-value trips.',
  Invoice,
  AdminInvoice,
  Voucher,
};
