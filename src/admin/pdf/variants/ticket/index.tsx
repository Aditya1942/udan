/** "Ticket" family: e-ticket / boarding-pass language across the Invoice, Admin invoice and Voucher. */
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';
import { Invoice } from './Invoice';
import { Voucher } from './Voucher';

export const ticket: VariantFamily = {
  id: 'ticket',
  name: 'E-ticket',
  tagline: 'Boarding-pass stubs: perforated tickets with confirmation codes, a tear-off payment slip and an ops manifest.',
  Invoice,
  AdminInvoice,
  Voucher,
};
