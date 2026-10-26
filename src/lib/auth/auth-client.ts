// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient } from 'better-auth/react';
import { adminClient, organizationClient } from 'better-auth/client/plugins';
import { appAc, appRoles, orgAc, orgRoles } from '@lib/auth/permissions';

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac: appAc, roles: appRoles }),
    organizationClient({ ac: orgAc, roles: orgRoles }),
    passkeyClient(),
  ],
});
