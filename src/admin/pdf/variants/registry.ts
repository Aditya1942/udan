/** Every template family shown on `/templates`. Order = display order. */
import { band } from './band';
import { current } from './current';
import { ledger } from './ledger';
import { mobile } from './mobile';
import { premium } from './premium';
import { reference } from './reference';
import { ticket } from './ticket';
import type { VariantFamily } from './types';

export const FAMILIES: VariantFamily[] = [reference, current, ledger, band, ticket, mobile, premium];
