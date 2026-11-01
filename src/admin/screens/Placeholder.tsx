import type { ReactNode } from 'react';
import { EmptyState } from '../ui';

/** Stand-in body for screens built in later phases. */
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return <EmptyState title={title}>{children ?? 'This screen is built in a later phase.'}</EmptyState>;
}
