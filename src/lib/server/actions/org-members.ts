// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { auth } from '@lib/auth/auth';
import { isAppAdmin, splitRoles } from '@lib/auth/permissions';
import { db } from '@lib/db';
import { member, session as session_ } from '@lib/db/schema';
import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import { eq } from 'drizzle-orm';

/** Creates a user account (credential login) and adds it to an organization. */
export async function createMemberAction(input: {
  organizationId: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'operator' | 'auditor';
}): Promise<ActionResult<{ userId: string }>> {
  return authedAction(async (session) => {
    if (!['admin', 'operator', 'auditor'].includes(input.role)) {
      throw new Error('Invalid role');
    }
    if (input.password.length < 8 || input.password.length > 128) {
      throw new Error('Password must be between 8 and 128 characters');
    }
    const email = input.email.trim().toLowerCase();
    if (!input.name.trim() || !email.includes('@')) {
      throw new Error('Name and a valid email are required');
    }

    const rows = await db
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(eq(member.organizationId, input.organizationId));
    const caller = rows.find((m) => m.userId === session.user.id);
    const appRole = (session.user as { role?: string | null }).role;
    if (!isAppAdmin(appRole) && !splitRoles(caller?.role).includes('admin')) {
      throw new Error('Only organization admins can add members');
    }

    const ctx = await auth.$context;
    const existing = await ctx.internalAdapter.findUserByEmail(email);
    if (existing) throw new Error('A user with this email already exists');

    const user = await ctx.internalAdapter.createUser(
      {
        email,
        name: input.name.trim(),
        emailVerified: true,
        role: 'user',
      },
      { method: 'admin' },
    );
    await ctx.internalAdapter.createAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: await ctx.password.hash(input.password),
    });
    await db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      userId: user.id,
      role: input.role,
      createdAt: new Date(),
    });
    return { userId: user.id };
  });
}

/**
 * Lets an organization admin (or an application admin) set a new password for
 * a member of that organization. Better Auth's admin plugin only covers
 * application admins, so organization admins are handled here.
 */
export async function resetMemberPasswordAction(input: {
  organizationId: string;
  userId: string;
  newPassword: string;
}): Promise<ActionResult<true>> {
  return authedAction(async (session) => {
    if (input.newPassword.length < 8 || input.newPassword.length > 128) {
      throw new Error('Password must be between 8 and 128 characters');
    }

    const rows = await db
      .select({ userId: member.userId, role: member.role })
      .from(member)
      .where(eq(member.organizationId, input.organizationId));

    const target = rows.find((m) => m.userId === input.userId);
    if (!target) throw new Error('User is not a member of this organization');

    const appRole = (session.user as { role?: string | null }).role;
    const caller = rows.find((m) => m.userId === session.user.id);
    const callerIsOrgAdmin = splitRoles(caller?.role).includes('admin');
    if (!isAppAdmin(appRole) && !callerIsOrgAdmin) {
      throw new Error('Only organization admins can reset passwords');
    }

    const ctx = await auth.$context;
    // Application admins may only be managed by application admins.
    const user = await ctx.internalAdapter.findUserById(input.userId);
    if (
      user &&
      isAppAdmin((user as { role?: string | null }).role) &&
      !isAppAdmin(appRole)
    ) {
      throw new Error('Cannot reset the password of an application admin');
    }

    await ctx.internalAdapter.updatePassword(
      input.userId,
      await ctx.password.hash(input.newPassword),
    );
    await db.delete(session_).where(eq(session_.userId, input.userId));
    return true as const;
  });
}
