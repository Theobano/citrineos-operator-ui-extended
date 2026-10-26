// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { parseOrganizationMetadata } from '@lib/auth/organization-metadata';
import { isAppAdmin } from '@lib/auth/permissions';
import { db } from '@lib/db';
import { organization } from '@lib/db/schema';
import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import config from '@lib/utils/config';
import { HasuraHeader, HasuraRole } from '@lib/utils/hasura.types';

const MAX_TENANT_QUERY = `query MaxTenantId {
  Tenants(order_by: { id: desc }, limit: 1) { id }
}`;

/** Highest tenant id registered in CitrineOS (null when it cannot be read). */
const getCitrineMaxTenantId = async (): Promise<number | null> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [HasuraHeader.X_HASURA_ROLE]: HasuraRole.ADMIN,
    };
    if (config.hasuraAdminSecret) {
      headers[HasuraHeader.X_HASURA_ADMIN_SECRET] = config.hasuraAdminSecret;
    }
    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: MAX_TENANT_QUERY }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors) return null;
    const rows: { id: number }[] = json.data?.Tenants ?? [];
    return rows.length ? Number(rows[0].id) : 0;
  } catch {
    return null;
  }
};

/**
 * Next free tenant id for a new organization: the largest tenant id registered
 * by CitrineOS (or already assigned to an organization here) plus one.
 */
export async function getNextTenantIdAction(): Promise<ActionResult<number>> {
  return authedAction(async (session) => {
    if (!isAppAdmin((session.user as { role?: string | null }).role)) {
      throw new Error('Only application admins can create tenants');
    }
    const orgs = await db
      .select({ metadata: organization.metadata })
      .from(organization);
    const assigned = orgs
      .map((o) => Number(parseOrganizationMetadata(o.metadata).tenantId))
      .filter((n) => Number.isFinite(n));
    const citrine = await getCitrineMaxTenantId();
    const max = Math.max(citrine ?? 0, ...assigned, 0);
    return max + 1;
  });
}
