import { parseCorsOrigins } from './cors-origin.util';

describe('parseCorsOrigins', () => {
  it('uses local-only defaults outside production', () => {
    expect(parseCorsOrigins(undefined, 'development')).toEqual([
      'http://localhost:5173', 'http://127.0.0.1:5173',
      'http://localhost:4173', 'http://127.0.0.1:4173',
    ]);
  });
  it('accepts the canonical production origin', () => {
    expect(parseCorsOrigins('https://cws-portal.vercel.app/', 'production')).toEqual(['https://cws-portal.vercel.app']);
  });
  it('rejects wildcard and missing production configuration', () => {
    expect(() => parseCorsOrigins('*', 'production')).toThrow(/wildcard/);
    expect(() => parseCorsOrigins(undefined, 'production')).toThrow(/required/);
  });
  it('rejects unapproved production origins', () => {
    expect(() => parseCorsOrigins('https://evil.example', 'production')).toThrow(/approved/);
  });
});
