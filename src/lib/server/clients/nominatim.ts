// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import config from '@lib/utils/config';

/**
 * Minimal Nominatim client. Follows the OSM usage policy: identifying
 * User-Agent and at most one request per second (enforced here).
 * Point NOMINATIM_URL at a self-hosted instance for heavy use.
 */
let lastRequestAt = 0;

export async function nominatimFetch<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const wait = lastRequestAt + 1000 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const url = new URL(path, config.nominatimUrl);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (config.nominatimContactEmail) {
    url.searchParams.set('email', config.nominatimContactEmail);
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': `${config.appName}-operator-ui` },
  });
  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status})`);
  }
  return (await response.json()) as T;
}
