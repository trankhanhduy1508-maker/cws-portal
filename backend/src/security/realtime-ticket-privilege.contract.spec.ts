import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('realtime ticket privilege contract', () => {
  it('revokes explicit anon/authenticated execution', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../migrations/020_create_realtime_access_tickets.sql'),
      'utf8',
    );
    expect(migration).toContain('FROM anon, authenticated, PUBLIC');
    expect(migration).toContain('TO service_role');
  });
});
