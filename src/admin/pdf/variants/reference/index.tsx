/** "Reference" family: the owner's own hotel voucher and invoice #402, rebuilt on our view-models. */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const reference: VariantFamily = {
  id: 'reference',
  name: 'Your reference — Navy & indigo',
  tagline: 'Your own hotel voucher and invoice #402, rebuilt: navy letterhead box, label tables, numbered item grid.',
  Invoice,
  AdminInvoice,
  Voucher,
};
