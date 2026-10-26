// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

export type OrganizationMetadata = { tenantId?: string | number };

/** better-auth stores organization metadata as a JSON string; normalise to an object. */
export const parseOrganizationMetadata = (
  metadata: unknown,
): OrganizationMetadata => {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata) as OrganizationMetadata;
    } catch {
      return {};
    }
  }
  return metadata as OrganizationMetadata;
};
