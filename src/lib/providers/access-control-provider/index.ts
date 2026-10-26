// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import {
  accessLevelAllows,
  type AccessLevel,
} from '@lib/auth/permissions';
import {
  ActionType,
  type ListCanReturnType,
  type OperatorCanParams,
} from '@lib/utils/access.types';
import type { AccessControlProvider } from '@refinedev/core';

/**
 * Configuration options for access provider
 */
export interface AccessProviderConfig<TPermissions = unknown> {
  getPermissions: (
    params?: Record<string, any>,
  ) => Promise<TPermissions | null>;
  getUserRole: (permissions?: TPermissions) => Promise<string | undefined>;
}

type Permissions = { accessLevel?: AccessLevel };

const CACHE_MS = 15_000;

/**
 * Permissions are derived from the effective access level:
 * - full  (app admin/superadmin, organization admin): everything
 * - write (organization operator): everything except delete
 * - read  (application/organization auditor): list, show and read-only access
 * Commands (e.g. remote start/stop, reset) require write access.
 */
export const createAccessProvider = <TPermissions = unknown>(
  config: AccessProviderConfig<TPermissions>,
): AccessControlProvider => {
  const { getPermissions } = config;
  let cached: { at: number; level: AccessLevel | undefined } | undefined;

  const getLevel = async (): Promise<AccessLevel | undefined> => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.level;
    const permissions = (await getPermissions()) as Permissions | null;
    cached = { at: Date.now(), level: permissions?.accessLevel };
    return cached.level;
  };

  return {
    can: async (operatorCanParams: OperatorCanParams) => {
      const { action } = operatorCanParams;
      const level = await getLevel();

      if (!level || level === 'none') {
        return {
          can: false,
          reason: 'You have no role in the active organization',
        } as ListCanReturnType;
      }

      const allowed = accessLevelAllows(
        level,
        action === ActionType.COMMAND ? 'edit' : action,
      );
      return {
        can: allowed,
        reason: allowed
          ? undefined
          : `Your role (${level}) does not permit '${action}'`,
      } as ListCanReturnType;
    },
  };
};
