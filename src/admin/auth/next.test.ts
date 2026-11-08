import { describe, expect, it } from 'vitest';
import { loginPathFor, safeNext } from './next';

describe('safeNext', () => {
  it.each([
    ['/admin', '/admin'],
    ['/admin/customers/c1', '/admin/customers/c1'],
    ['/admin?month=2026-11&view=table', '/admin?month=2026-11&view=table'],
    ['/admin/bookings/new?start=2026-11-05', '/admin/bookings/new?start=2026-11-05'],
  ])('keeps the admin path %s', (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });

  it.each([
    null,
    '',
    'admin/customers',
    '/',
    '/contact',
    '/administrator',
    '//evil.example/admin',
    'https://evil.example/admin',
    '/\\evil.example',
    '/admin/../contact',
    '/admin/login',
    '/admin/login?next=/admin/customers',
    'javascript:alert(1)',
  ])('falls back to /admin for %s', (next) => {
    expect(safeNext(next)).toBe('/admin');
  });
});

describe('loginPathFor', () => {
  it('carries a deep link as ?next=', () => {
    expect(loginPathFor('/admin/customers/c1?tab=x')).toBe('/admin/login?next=%2Fadmin%2Fcustomers%2Fc1%3Ftab%3Dx');
  });
  it('omits next for the dashboard', () => {
    expect(loginPathFor('/admin')).toBe('/admin/login');
  });
});
