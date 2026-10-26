// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { db } from '@lib/db';
import { userPreference } from '@lib/db/schema';
import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import { eq } from 'drizzle-orm';

export type UserPreferences = {
  dateFormat?: 'locale' | 'iso';
  timezone?: string;
  pageSize?: number;
  compactTables?: boolean;
  startPage?: string;
};

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

const sanitize = (input: UserPreferences): UserPreferences => ({
  dateFormat: input.dateFormat === 'iso' ? 'iso' : 'locale',
  timezone:
    typeof input.timezone === 'string' ? input.timezone.slice(0, 64) : '',
  pageSize: ALLOWED_PAGE_SIZES.includes(Number(input.pageSize))
    ? Number(input.pageSize)
    : 20,
  compactTables: !!input.compactTables,
  startPage:
    typeof input.startPage === 'string' && input.startPage.startsWith('/')
      ? input.startPage.slice(0, 64)
      : '/overview',
});

export async function getPreferencesAction(): Promise<
  ActionResult<UserPreferences>
> {
  return authedAction(async (session) => {
    const [row] = await db
      .select()
      .from(userPreference)
      .where(eq(userPreference.userId, session.user.id));
    return sanitize((row?.preferences ?? {}) as UserPreferences);
  });
}

export async function savePreferencesAction(
  input: UserPreferences,
): Promise<ActionResult<UserPreferences>> {
  return authedAction(async (session) => {
    const preferences = sanitize(input);
    await db
      .insert(userPreference)
      .values({ userId: session.user.id, preferences })
      .onConflictDoUpdate({
        target: userPreference.userId,
        set: { preferences },
      });
    return preferences;
  });
}
