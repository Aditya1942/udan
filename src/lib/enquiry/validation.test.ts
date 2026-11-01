import { describe, expect, it } from 'vitest';
import { normalisePhone, validateEnquiry, type EnquiryInput } from './validation';

describe('normalisePhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['98765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+91-98765-43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['91 98765 43210', '+919876543210'],
    ['0091 98765 43210', '+919876543210'],
    ['098765 43210', '+919876543210'],
    ['(+91) 98765.43210', '+919876543210'],
    ['  6000000000 ', '+916000000000'],
  ])('%j → %s', (raw, expected) => {
    expect(normalisePhone(raw)).toBe(expected);
  });

  it.each([
    '',
    '12345',
    '5876543210', // Indian mobiles start 6–9
    '98765432101',
    '+1 415 555 0123',
    '+44 7700 900123',
    '022 1234 5678', // landline
    '98765abcde',
    '++919876543210',
  ])('rejects %j', (raw) => {
    expect(normalisePhone(raw)).toBeNull();
  });
});

describe('validateEnquiry', () => {
  const base: EnquiryInput = {
    name: '  Asha   Patel ',
    phone: '98765 43210',
    service: 'hotel-booking',
    message: '  Two rooms  ',
    sourcePage: '/',
    destination: '  Kerala ',
  };

  it('normalises a valid enquiry', () => {
    expect(validateEnquiry(base)).toEqual({
      ok: true,
      value: {
        name: 'Asha Patel',
        phone: '+919876543210',
        service: 'hotel-booking',
        message: 'Two rooms',
        sourcePage: '/',
        destination: 'Kerala',
      },
    });
  });

  it('stores a missing destination as null and a missing message as empty', () => {
    const result = validateEnquiry({ ...base, destination: '  ', message: undefined });
    expect(result).toMatchObject({ ok: true, value: { destination: null, message: '' } });
  });

  it('reports every invalid field', () => {
    const result = validateEnquiry({
      name: 'A',
      phone: '123',
      service: 'free-holidays',
      message: 'x'.repeat(2001),
      sourcePage: '/',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.fieldErrors).sort()).toEqual(['message', 'name', 'phone', 'service']);
  });

  it('rejects names over 100 characters', () => {
    expect(validateEnquiry({ ...base, name: 'n'.repeat(101) }).ok).toBe(false);
  });
});
