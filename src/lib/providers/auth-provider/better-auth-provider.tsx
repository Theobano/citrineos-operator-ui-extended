// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { parseOrganizationMetadata } from '@lib/auth/organization-metadata';
import { isAppAdmin, resolveAccessLevel } from '@lib/auth/permissions';
import { LoginPage } from '@lib/client/components/login/login-page';
import type {
  AuthenticationContextProvider,
  User,
} from '@lib/utils/access.types';
import config from '@lib/utils/config';
import { HasuraHeader, HasuraRole } from '@lib/utils/hasura.types';
import { parseJwt } from '@lib/utils/jwt';
import type { AuthProvider } from '@refinedev/core';
import { redirect } from 'next/navigation';

export interface AuthUserIdentity extends User {
  image?: string | null;
  tenantId?: string;
  activeOrganizationId?: string | null;
}

const isKeycloak = config.authProvider === 'keycloak';
const tenantCache = new Map<string, string>();

const getSession = async () => (await authClient.getSession()).data;

const getRoles = (role?: string | null): string[] =>
  (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

/** Tenant = `tenantId` metadata of the active organization (falls back to NEXT_PUBLIC_TENANT_ID). */
const resolveTenantId = async (
  organizationId?: string | null,
): Promise<string> => {
  if (!organizationId) return config.tenantId;
  const cached = tenantCache.get(organizationId);
  if (cached) return cached;
  const { data } = await authClient.organization.getFullOrganization({
    query: { organizationId },
  });
  const tenantId = parseOrganizationMetadata(data?.metadata).tenantId;
  const resolved = tenantId ? String(tenantId) : config.tenantId;
  tenantCache.set(organizationId, resolved);
  return resolved;
};

const getToken = async (): Promise<string | undefined> => {
  if (isKeycloak) {
    const { data } = await authClient.getAccessToken({
      providerId: 'keycloak',
    } as never);
    return data?.accessToken;
  }
  return (await getSession())?.session.token;
};

const getUserRole = async (): Promise<string | undefined> => {
  const role = (await getSession())?.user.role;
  if (getRoles(role).length === 0) return undefined;
  return isAppAdmin(role) ? HasuraRole.ADMIN : HasuraRole.USER;
};

const getHasuraHeaders = async (): Promise<Map<HasuraHeader, string>> => {
  const headers = new Map<HasuraHeader, string>();
  const session = await getSession();
  if (!session) return headers;

  const role = await getUserRole();
  if (role) headers.set(HasuraHeader.X_HASURA_ROLE, role);

  const keycloakToken = isKeycloak ? await getToken() : undefined;
  const tenantId =
    (keycloakToken ? parseJwt(keycloakToken).tenant_id : undefined) ??
    (await resolveTenantId(
      (session.session as { activeOrganizationId?: string | null })
        .activeOrganizationId,
    ));
  headers.set(HasuraHeader.X_HASURA_TENANT_ID, String(tenantId));
  return headers;
};

export const createBetterAuthProvider = (): AuthProvider &
  AuthenticationContextProvider => ({
  login: async ({ email, password, redirectTo }) => {
    const target = redirectTo || '/overview';
    if (isKeycloak) {
      await authClient.signIn.social({
        provider: 'keycloak',
        callbackURL: target,
      });
      return { success: true };
    }
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: error.message || 'Invalid email or password',
        },
      };
    }
    return { success: true, redirectTo: target };
  },

  logout: async ({ redirectTo } = {}) => {
    await authClient.signOut();
    tenantCache.clear();
    if (isKeycloak && config.keycloakUrl && config.keycloakClientId) {
      const params = new URLSearchParams({
        client_id: config.keycloakClientId,
        post_logout_redirect_uri: `${window.location.origin}${redirectTo || '/login'}`,
      });
      redirect(`${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect/logout?${params}`);
      return { success: true };
    }
    return { success: true, redirectTo: redirectTo || '/login' };
  },

  check: async () => {
    const session = await getSession();
    if (session?.user) return { authenticated: true };
    return {
      authenticated: false,
      logout: true,
      redirectTo: '/login',
      error: { name: 'Authentication Error', message: 'Not authenticated' },
    };
  },

  onError: async (error) => {
    if (error?.statusCode === 401) return { logout: true };
    return { error };
  },

  getIdentity: async (): Promise<AuthUserIdentity | null> => {
    const session = await getSession();
    if (!session?.user) return null;
    const activeOrganizationId = (
      session.session as { activeOrganizationId?: string | null }
    ).activeOrganizationId;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roles: getRoles(session.user.role),
      activeOrganizationId,
      tenantId: await resolveTenantId(activeOrganizationId),
    };
  },

  getPermissions: async () => {
    const session = await getSession();
    const appRole = session?.user.role;
    let orgRole: string | undefined;
    if (!isAppAdmin(appRole) && session) {
      const { data } = await authClient.organization.getActiveMemberRole();
      orgRole = data?.role;
    }
    return {
      roles: getRoles(appRole),
      orgRole,
      accessLevel: resolveAccessLevel(appRole, orgRole),
    };
  },

  getToken,
  getUserRole,
  getHasuraHeaders,
  getInitialized: async () => true,
  getLoginPage: () => LoginPage,
});
