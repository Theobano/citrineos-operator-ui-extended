// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import { auth, type Session } from '@lib/auth/auth';
import { headers } from 'next/headers';

export type AuthedSession = Session;

export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'ERROR';
    };

class ForbiddenError extends Error {}

/** Returns the current Better Auth session (server side) or null. */
export async function getServerSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export async function authedAction<T>(
  fn: (session: AuthedSession) => Promise<T>,
): Promise<ActionResult<T>> {
  let session: Session | null = null;

  try {
    session = await getServerSession();
  } catch {
    return {
      success: false,
      error: 'Failed to retrieve session',
      code: 'ERROR',
    };
  }

  if (!session?.user) {
    return { success: false, error: 'Unauthenticated', code: 'UNAUTHORIZED' };
  }

  try {
    return { success: true, data: await fn(session) };
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return { success: false, error: err.message, code: 'FORBIDDEN' };
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message, code: 'ERROR' };
  }
}

/** Role-gated guard: the user must hold `requiredRole` (comma separated roles supported). */
export async function authedActionWithRole<T>(
  requiredRole: string,
  fn: (session: AuthedSession) => Promise<T>,
): Promise<ActionResult<T>> {
  return authedAction(async (session) => {
    const roles = ((session.user as { role?: string | null }).role ?? '')
      .split(',')
      .map((r) => r.trim());
    if (!roles.includes(requiredRole)) {
      throw new ForbiddenError(`Required role: ${requiredRole}`);
    }
    return fn(session);
  });
}
