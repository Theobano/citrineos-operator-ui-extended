// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Optimistic route protection: redirects requests without a Better Auth
 * session cookie to /login. The session itself is fully validated in server
 * actions (see `authedAction`) and the authenticated layout.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Excludes /login, /api/auth, /api/health, Next internals and root static files.
  matcher: [
    '/((?!login|invite|api/auth|api/health|_next/static|_next/image|favicon\\.ico|[^/]+\\.[^/]+$).*)',
  ],
};
