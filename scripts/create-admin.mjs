// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Creates (or promotes) a superadmin account and, optionally, a default
 * organization mapped to a CitrineOS tenant.
 *
 *   pnpm db:create-admin --email admin@example.com --password 'S3cret-pass' \
 *     [--name Administrator] [--tenant-id 1] [--no-org]
 *
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME can be used instead of flags.
 * Requires AUTH_DATABASE_URL and a migrated database (pnpm db:migrate).
 */
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const email = (flag('email') || process.env.ADMIN_EMAIL || '')
  .trim()
  .toLowerCase();
const password = flag('password') || process.env.ADMIN_PASSWORD || '';
const name = flag('name') || process.env.ADMIN_NAME || 'Administrator';
const tenantId = flag('tenant-id') || process.env.NEXT_PUBLIC_TENANT_ID || '1';
const createOrg = !args.includes('--no-org');

if (!email.includes('@') || password.length < 8 || password.length > 128) {
  console.error(
    'Usage: pnpm db:create-admin --email <email> --password <8-128 chars> [--name <name>] [--tenant-id <id>] [--no-org]',
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString:
    process.env.AUTH_DATABASE_URL ||
    'postgresql://citrine:citrine@localhost:5432/citrine_auth',
});

await client.connect();
try {
  await client.query('BEGIN');
  const now = new Date();

  const existing = await client.query(
    'SELECT id FROM "user" WHERE email = $1',
    [email],
  );
  let userId = existing.rows[0]?.id;

  if (userId) {
    await client.query(
      `UPDATE "user" SET role = 'superadmin', email_verified = true, updated_at = $2 WHERE id = $1`,
      [userId, now],
    );
    console.log(`User ${email} already exists: promoted to superadmin.`);
  } else {
    userId = randomUUID();
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, true, 'superadmin', $4, $4)`,
      [userId, name, email, now],
    );
    console.log(`Created superadmin ${email}.`);
  }

  const credential = await client.query(
    `SELECT id FROM account WHERE user_id = $1 AND provider_id = 'credential'`,
    [userId],
  );
  const hash = await hashPassword(password);
  if (credential.rows[0]) {
    await client.query(
      'UPDATE account SET password = $2, updated_at = $3 WHERE id = $1',
      [credential.rows[0].id, hash, now],
    );
  } else {
    await client.query(
      `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, 'credential', $2, $3, $4, $4)`,
      [randomUUID(), userId, hash, now],
    );
  }

  if (createOrg) {
    const org = await client.query(
      `SELECT id FROM organization WHERE slug = 'default'`,
    );
    let organizationId = org.rows[0]?.id;
    if (!organizationId) {
      organizationId = randomUUID();
      await client.query(
        `INSERT INTO organization (id, name, slug, created_at, metadata)
         VALUES ($1, 'Default', 'default', $2, $3)`,
        [organizationId, now, JSON.stringify({ tenantId })],
      );
      console.log(`Created organization "Default" (tenant ${tenantId}).`);
    }
    const membership = await client.query(
      'SELECT id FROM member WHERE organization_id = $1 AND user_id = $2',
      [organizationId, userId],
    );
    if (!membership.rows[0]) {
      await client.query(
        `INSERT INTO member (id, organization_id, user_id, role, created_at)
         VALUES ($1, $2, $3, 'admin', $4)`,
        [randomUUID(), organizationId, userId, now],
      );
    }
  }

  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
