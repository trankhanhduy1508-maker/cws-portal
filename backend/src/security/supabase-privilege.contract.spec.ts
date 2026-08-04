import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Supabase privilege hardening contracts', () => {
  it('removes public access from privileged Admin surfaces', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../migrations/021_security_privilege_hardening.sql'),
      'utf8',
    );

    expect(migration).toContain("p.proname LIKE 'admin\\\\_%'");
    expect(migration).toContain('FROM anon, authenticated, PUBLIC');
    expect(migration).toContain('ALTER VIEW public.payment_reconciliation_anomalies');
    expect(migration).toContain('security_invoker = true');
    expect(migration).toContain('DROP POLICY IF EXISTS "allow insert remote_commands"');
    expect(migration).toContain('REVOKE ALL ON TABLE public.remote_commands');
  });
});
