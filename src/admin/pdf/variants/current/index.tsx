/** The templates in production today ("Minimal letter"), wrapped in the variant contract. */
import { InvoiceDocument } from '../../InvoiceDocument';
import { VoucherDocument } from '../../VoucherDocument';
import type { VariantFamily } from '../types';
import { AdminInvoice } from './AdminInvoice';

export const current: VariantFamily = {
  id: 'current',
  name: 'Current — Minimal letter',
  tagline: 'What ships today: quiet letter layout, day timeline voucher.',
  Invoice: ({ view, assets }) => <InvoiceDocument view={view} wordmark={assets.wordmark} qr={assets.qr} />,
  AdminInvoice,
  Voucher: ({ view, assets }) => <VoucherDocument view={view} wordmark={assets.wordmark} />,
};
