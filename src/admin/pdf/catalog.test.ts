import { describe, expect, it } from 'vitest';
import { defaultTemplate, FALLBACK_TEMPLATE, TEMPLATE_CATALOG, templateIdOr } from './catalog';
import { FAMILIES } from './variants/registry';

describe('template catalog', () => {
  it('lists every renderable family, same ids and order', () => {
    expect(TEMPLATE_CATALOG.map((t) => t.id)).toEqual(FAMILIES.map((f) => f.id));
    expect(TEMPLATE_CATALOG.map((t) => t.name)).toEqual(FAMILIES.map((f) => f.name));
  });

  it('resolves defaults: saved id, else fallback for missing/unknown ids', () => {
    expect(defaultTemplate({ defaults: { voucher: 'ticket' } }, 'voucher')).toBe('ticket');
    expect(defaultTemplate({ defaults: {} }, 'invoice')).toBe(FALLBACK_TEMPLATE);
    expect(templateIdOr('removed-family')).toBe(FALLBACK_TEMPLATE);
  });
});
