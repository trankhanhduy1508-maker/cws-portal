import { getAuthenticatorAssuranceLevel } from './jwt-claims.util';

function makeToken(payload: Record<string, unknown> | null): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  if (payload === null) return `${header}.not-valid-base64json.sig`;
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('getAuthenticatorAssuranceLevel', () => {
  it('trả về "aal2" khi claim aal = "aal2"', () => {
    expect(getAuthenticatorAssuranceLevel(makeToken({ aal: 'aal2' }))).toBe('aal2');
  });

  it('trả về "aal1" khi claim aal = "aal1"', () => {
    expect(getAuthenticatorAssuranceLevel(makeToken({ aal: 'aal1' }))).toBe('aal1');
  });

  it('trả về "aal1" khi token KHÔNG có claim aal (token cũ/không phải Supabase MFA)', () => {
    expect(getAuthenticatorAssuranceLevel(makeToken({}))).toBe('aal1');
  });

  it('trả về null khi token không đúng cấu trúc 3 phần', () => {
    expect(getAuthenticatorAssuranceLevel('not-a-jwt')).toBeNull();
  });

  it('trả về null khi phần payload không decode được JSON hợp lệ', () => {
    expect(getAuthenticatorAssuranceLevel(makeToken(null))).toBeNull();
  });
});
