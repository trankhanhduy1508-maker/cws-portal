export type AuthRole = 'customer' | 'admin';

export interface AuthPrincipal {
  userId: string;
  role: AuthRole;
}
