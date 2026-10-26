// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { auth } from '@lib/auth/auth';
import { db } from '@lib/db';
import { invitation, organization, user } from '@lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export type InvitationInfo = {
  email: string;
  organizationName: string;
  role: string | null;
  userExists: boolean;
};

const findPending = async (id: string) => {
  const [row] = await db
    .select({
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .where(eq(invitation.id, id))
    .limit(1);
  if (!row || row.status !== 'pending' || row.expiresAt < new Date()) {
    return null;
  }
  return row;
};

const userExistsByEmail = async (email: string) => {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, email.toLowerCase()))
    .limit(1);
  return !!row;
};

export async function getInvitationAction(
  id: string,
): Promise<{ data?: InvitationInfo; error?: string }> {
  const inv = await findPending(id);
  if (!inv) return { error: 'This invitation is invalid or has expired.' };
  return {
    data: {
      email: inv.email,
      organizationName: inv.organizationName,
      role: inv.role,
      userExists: await userExistsByEmail(inv.email),
    },
  };
}

/**
 * Creates the account for an invited email address. The email always comes
 * from the invitation, so only the invited person can claim it.
 */
export async function createAccountFromInvitationAction(input: {
  invitationId: string;
  name: string;
  password: string;
}): Promise<{ email?: string; error?: string }> {
  const name = input.name.trim();
  if (!name) return { error: 'Name is required.' };
  if (input.password.length < 8 || input.password.length > 128) {
    return { error: 'Password must be between 8 and 128 characters.' };
  }
  const inv = await findPending(input.invitationId);
  if (!inv) return { error: 'This invitation is invalid or has expired.' };
  if (await userExistsByEmail(inv.email)) {
    return { error: 'An account already exists. Please sign in instead.' };
  }

  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createUser(
    {
      email: inv.email.toLowerCase(),
      name,
      emailVerified: true, // the invitation email was delivered to this address
      role: 'user',
    },
    { method: 'invitation' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: 'credential',
    accountId: created.id,
    password: await ctx.password.hash(input.password),
  });
  return { email: inv.email };
}
