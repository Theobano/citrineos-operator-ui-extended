// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authProvider } from '@lib/providers/auth-provider';
import { ResourceType } from '@lib/utils/access.types';
import config from '@lib/utils/config';
import { HasuraHeader } from '@lib/utils/hasura.types';
import dataProviderHasura, {
  GraphQLClient,
  type HasuraDataProviderOptions,
} from '@refinedev/hasura';
import { getHasuraAdminSecretAction } from '@lib/server/actions/getHasuraAdminSecretAction';

const requestMiddleware = async (request: any) => {
  const requestHeaders = {
    ...request.headers,
  };

  const hasuraAdminSecret = await getHasuraAdminSecretAction().then((result) =>
    result.success ? result.data : '',
  );

  if (hasuraAdminSecret) {
    requestHeaders[HasuraHeader.X_HASURA_ADMIN_SECRET] = hasuraAdminSecret;
  } else if (authProvider) {
    const token = await authProvider.getToken();
    if (token) {
      requestHeaders['Authorization'] = 'Bearer ' + token;
    }
  }
  if (authProvider) {
    // Role and tenant (active organization) scope every request, also when
    // the admin secret is used, so tenants stay isolated.
    const hasuraHeaders = await authProvider.getHasuraHeaders();
    for (const header of [
      HasuraHeader.X_HASURA_ROLE,
      HasuraHeader.X_HASURA_TENANT_ID,
    ]) {
      const value = hasuraHeaders?.get(header);
      if (value) requestHeaders[header] = value;
    }
  }
  return {
    ...request,
    headers: requestHeaders,
  };
};

const API_URL = config.apiUrl;

const client = new GraphQLClient(API_URL, {
  requestMiddleware,
});

const hasuraProviderOptions = {
  idType: 'Int',
  namingConvention: 'hasura-default',
};

const dataProvider = dataProviderHasura(
  client,
  hasuraProviderOptions as HasuraDataProviderOptions,
);

dataProvider.getApiUrl = () => {
  return API_URL;
};

export default dataProvider;
