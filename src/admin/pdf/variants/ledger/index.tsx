/** "Ledger" family: the classic Indian ruled business bill — print-first, B&W friendly. */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const ledger: VariantFamily = {
  id: 'ledger',
  name: 'Classic ledger',
  tagline: 'The ruled-box bill CAs expect: one framed page, Sr/Particulars/Amount table, amount in words, signatory box.',
  Invoice,
  AdminInvoice,
  Voucher,
};
