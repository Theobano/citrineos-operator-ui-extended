// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const databaseUrl =
  process.env.AUTH_DATABASE_URL ||
  'postgresql://citrine:citrine@localhost:5432/citrine_auth';

const globalForDb = globalThis as unknown as { __authPool?: Pool };

export const pool = (globalForDb.__authPool ??= new Pool({
  connectionString: databaseUrl,
}));

export const db = drizzle(pool, { schema });
