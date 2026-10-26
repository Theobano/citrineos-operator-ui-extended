// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Better Auth server instance.
 *
 * Plugins: admin (user management / roles), organization (tenants / teams),
 * passkey (WebAuthn) and, when NEXT_PUBLIC_AUTH_PROVIDER=keycloak, generic
 * OAuth (Keycloak SSO).
 *
 * Storage: PostgreSQL via Drizzle ORM (schema in src/lib/db, SQL migrations in ./drizzle), connection string from AUTH_DATABASE_URL.
 * Migrations are applied by the `auth-db-migrate` docker compose service (or `pnpm db:migrate`).
 */
import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins/admin';
import { genericOAuth } from 'better-auth/plugins/generic-oauth';
import { organization } from 'better-auth/plugins/organization';
import { asc, eq } from 'drizzle-orm';
import { db } from '@lib/db';
import * as schema from '@lib/db/schema';
import {
  appAc,
  appRoles,
  isAppAdmin,
  orgAc,
  orgRoles,
} from '@lib/auth/permissions';
import config from '@lib/utils/config';
import { parseJwt } from '@lib/utils/jwt';
import { actionEmail, sendMail } from '@lib/server/mailer';

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000';

const keycloakEnabled = config.authProvider === 'keycloak';
const keycloakBase = `${config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect`;
const keycloakServerBase = `${config.keycloakServerUrl || config.keycloakUrl}/realms/${config.keycloakRealm}/protocol/openid-connect`;

const plugins = [
  admin({
    ac: appAc,
    roles: appRoles,
    defaultRole: 'user',
    adminRoles: ['admin', 'superadmin'],
  }),
  organization({
    ac: orgAc,
    roles: orgRoles,
    creatorRole: 'admin',
    allowUserToCreateOrganization: (user) =>
      isAppAdmin((user as { role?: string | null }).role),
    sendInvitationEmail: async ({ email, role, organization, id }) => {
      const url = `${baseURL}/invite/${id}`;
      console.info(
        `[auth] Invitation to ${organization.name} for ${email} (${role}): ${url}`,
      );
      await sendMail({
        to: email,
        subject: `You have been invited to ${organization.name}`,
        ...actionEmail(
          config.appName,
          `You have been invited to join ${organization.name} as ${role}.`,
          'Accept invitation',
          url,
        ),
      });
    },
  }),
  passkey({
    rpID: new URL(baseURL).hostname,
    rpName: config.appName,
    origin: new URL(baseURL).origin,
  }),
  ...(keycloakEnabled
    ? [
        genericOAuth({
          config: [
            {
              providerId: 'keycloak',
              name: 'Keycloak',
              clientId: config.keycloakClientId!,
              clientSecret: config.keycloakClientSecret!,
              authorizationUrl: `${keycloakBase}/auth`,
              tokenUrl: `${keycloakServerBase}/token`,
              userInfoUrl: `${keycloakServerBase}/userinfo`,
              scopes: ['openid', 'profile', 'email'],
              pkce: true,
              overrideUserInfo: true,
              getUserInfo: async (tokens) => {
                const res = await fetch(`${keycloakServerBase}/userinfo`, {
                  headers: { Authorization: `Bearer ${tokens.accessToken}` },
                });
                if (!res.ok) return null;
                const profile = await res.json();
                const claims = tokens.accessToken
                  ? parseJwt(tokens.accessToken)
                  : {};
                const roles: string[] =
                  claims.resource_access?.[config.keycloakClientId!]?.roles ||
                  [];
                return {
                  id: profile.sub,
                  email: profile.email,
                  name: profile.name || profile.preferred_username,
                  image: profile.picture,
                  emailVerified: !!profile.email_verified,
                  roles,
                  tenantId: claims.tenant_id,
                };
              },
              mapProfileToUser: (profile) => ({
                role: (profile.roles as string[])?.includes('admin')
                  ? 'admin'
                  : 'user',
              }),
            },
          ],
        }),
      ]
    : []),
  nextCookies(),
];

export const auth = betterAuth({
  appName: config.appName,
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // accounts are created by admins (admin plugin)
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        ...actionEmail(
          config.appName,
          'We received a request to reset your password. If this was not you, ignore this email.',
          'Reset password',
          url,
        ),
      });
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ['keycloak'] },
  },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  databaseHooks: {
    session: {
      create: {
        // Start every session in the user's first organization (tenant).
        before: async (session) => {
          const [first] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .orderBy(asc(schema.member.createdAt))
            .limit(1);
          return {
            data: {
              ...session,
              activeOrganizationId: first?.organizationId,
            },
          };
        },
      },
    },
  },
  plugins,
});

export type Session = typeof auth.$Infer.Session;
