import { describe, expect, it } from 'vitest';
import { getStaffOAuthRedirectUrl } from './staffAuth';

describe('getStaffOAuthRedirectUrl', () => {
  it('returns the dedicated Admin origin root for the separate Admin app', () => {
    expect(getStaffOAuthRedirectUrl({
      origin: 'https://cws-admin.vercel.app',
      pathname: '/',
    })).toBe('https://cws-admin.vercel.app/');
  });

  it('preserves the temporary legacy /admin rollback route on Customer Portal', () => {
    expect(getStaffOAuthRedirectUrl({
      origin: 'https://cws-portal.vercel.app',
      pathname: '/admin',
    })).toBe('https://cws-portal.vercel.app/admin');
  });

  it('does not send a dedicated Admin callback into Customer routing', () => {
    expect(getStaffOAuthRedirectUrl({
      origin: 'https://cws-admin.vercel.app',
      pathname: '/',
    })).not.toContain('/admin');
  });
});
