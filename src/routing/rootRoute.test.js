import { describe, expect, it } from 'vitest';
import { ROOT_ROUTE, resolveRootRoute } from './rootRoute.js';

describe('resolveRootRoute', () => {
  it.each([
    [{ pathname: '/', hash: '#/admin' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/', hash: '#admin' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/', hash: '#/admin/' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/', hash: '#/admin/jobs' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/', hash: '#/admin?tab=workers' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/admin', hash: '' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/admin/', hash: '' }, ROOT_ROUTE.ADMIN],
    [{ pathname: '/admin/settings', hash: '' }, ROOT_ROUTE.ADMIN],
  ])('resolves Admin route for %o', (locationLike, expected) => {
    expect(resolveRootRoute(locationLike)).toBe(expected);
  });

  it.each([
    [{ pathname: '/', hash: '' }, ROOT_ROUTE.APP],
    [{ pathname: '/', hash: '#host' }, ROOT_ROUTE.APP],
    [{ pathname: '/', hash: '#staff-login' }, ROOT_ROUTE.APP],
    [{ pathname: '/', hash: '#/administrator' }, ROOT_ROUTE.APP],
    [{ pathname: '/customer', hash: '#/history' }, ROOT_ROUTE.APP],
  ])('does not steal non-Admin routes for %o', (locationLike, expected) => {
    expect(resolveRootRoute(locationLike)).toBe(expected);
  });
});
