export const ROOT_ROUTE = Object.freeze({
  ADMIN: 'admin',
  APP: 'app',
});

const ADMIN_PATH_RE = /^\/admin(?:\/|$)/;
const ADMIN_HASH_RE = /^#\/?admin(?:[/?]|$)/;

/**
 * Resolve only the top-level application shell.
 *
 * This is intentionally deterministic and dependency-free: authorization
 * remains enforced by the existing Admin auth/backend boundaries. The sole
 * responsibility here is preventing the customer tree from being mounted
 * when the current URL is an Admin route.
 */
export function resolveRootRoute(locationLike = window.location) {
  const pathname = String(locationLike?.pathname || '/');
  const hash = String(locationLike?.hash || '');

  if (ADMIN_PATH_RE.test(pathname) || ADMIN_HASH_RE.test(hash)) {
    return ROOT_ROUTE.ADMIN;
  }

  return ROOT_ROUTE.APP;
}
