#!/usr/bin/env node
/** seed_admin_user.mjs — neuen Backoffice-Nutzer anlegen
 * Aufruf:
 *   DATABASE_URL=... node tools/seed_admin_user.mjs USERNAME PASSWORD ROLE 'Display Name' [email]
 * ROLE: ADMIN|OPERATOR|VIEWER
 */
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import postgres from 'postgres';
const scryptAsync = promisify(scrypt);

async function makeHash(password) {
  const salt = randomBytes(16);
  const N = 16384;
  const derived = await scryptAsync(password, salt, 64, { N });
  return `scrypt$${N}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

const [username, password, role, display, email] = process.argv.slice(2);
if (!username || !password || !role || !display) {
  console.error('Usage: seed_admin_user.mjs USERNAME PASSWORD ROLE "Display Name" [email]');
  process.exit(1);
}
if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(role)) {
  console.error('Invalid role:', role);
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

const hash = await makeHash(password);
const sql = postgres(url, { prepare: false });
try {
  const rows = await sql`
    insert into core.admin_user (username, password_hash, display_name, role, email)
    values (${username}, ${hash}, ${display}, ${role}, ${email ?? null})
    on conflict (username) do update set
      password_hash = excluded.password_hash,
      display_name = excluded.display_name,
      role = excluded.role,
      email = excluded.email,
      updated_at = now()
    returning id, username, role
  `;
  console.log('OK:', rows[0]);
} finally {
  await sql.end({ timeout: 1 });
}
