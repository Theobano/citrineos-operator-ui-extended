// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Role model shared by the Better Auth server/client and the UI.
 *
 * Application roles (admin plugin, `user.role`): user, auditor, admin, superadmin.
 * Organization roles (organization plugin, `member.role`): admin, operator, auditor.
 */
import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc as appAdminAc,
  defaultStatements as appStatements,
} from 'better-auth/plugins/admin/access';
import {
  adminAc as orgAdminAc,
  defaultStatements as orgStatements,
} from 'better-auth/plugins/organization/access';

export const APP_ROLES = ['user', 'auditor', 'admin', 'superadmin'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ORG_ROLES = ['admin', 'operator', 'auditor'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** What a user may do with the operational data (stations, transactions, ...). */
export type AccessLevel = 'full' | 'write' | 'read' | 'none';

export const appAc = createAccessControl(appStatements);
export const appRoles = {
  user: appAc.newRole({ user: [], session: [] }),
  auditor: appAc.newRole({ user: ['list', 'get'], session: ['list'] }),
  admin: appAc.newRole(appAdminAc.statements),
  superadmin: appAc.newRole({
    ...appAdminAc.statements,
    user: [...appStatements.user],
  }),
};

export const orgAc = createAccessControl(orgStatements);
export const orgRoles = {
  admin: orgAc.newRole({
    ...orgAdminAc.statements,
    organization: ['update', 'delete'],
  }),
  operator: orgAc.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
  }),
  auditor: orgAc.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
  }),
};

export const splitRoles = (role?: string | null): string[] =>
  (role ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

export const isAppAdmin = (role?: string | null): boolean => {
  const roles = splitRoles(role);
  return roles.includes('admin') || roles.includes('superadmin');
};

export const isSuperAdmin = (role?: string | null): boolean =>
  splitRoles(role).includes('superadmin');

export const isAppAuditor = (role?: string | null): boolean =>
  splitRoles(role).includes('auditor');

/**
 * Effective access to operational data.
 * - application admins / superadmins: full access everywhere
 * - application auditors: read-only everywhere
 * - everyone else: determined by the role in the active organization
 */
export const resolveAccessLevel = (
  appRole?: string | null,
  orgRole?: string | null,
): AccessLevel => {
  if (isAppAdmin(appRole)) return 'full';
  if (isAppAuditor(appRole)) return 'read';
  const roles = splitRoles(orgRole);
  if (roles.includes('admin') || roles.includes('owner')) return 'full';
  if (roles.includes('operator')) return 'write';
  if (roles.includes('auditor')) return 'read';
  return 'none';
};

/** Whether an access level allows a Refine action. */
export const accessLevelAllows = (
  level: AccessLevel,
  action: string,
): boolean => {
  switch (level) {
    case 'full':
      return true;
    case 'write':
      return action !== 'delete';
    case 'read':
      return action === 'list' || action === 'show' || action === 'access';
    default:
      return false;
  }
};
