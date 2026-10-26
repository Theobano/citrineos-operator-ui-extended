// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { type ActionResult, authedAction } from '@lib/utils/action-guard';
import { nominatimFetch } from '@lib/server/clients/nominatim';

export interface PlacePrediction {
  place_id: string;
  description: string;
}

/**
 * Address autocomplete backed by OpenStreetMap Nominatim (free, no API key).
 * `place_id` is an OSM identifier such as `W12345`, resolved by getPlaceDetails.
 */
export async function autocompleteAddress(
  input: string,
  country?: string,
  _sessionToken?: string,
): Promise<ActionResult<PlacePrediction[]>> {
  return authedAction<PlacePrediction[]>(async () => {
    if (!input) throw new Error('Missing input for autocomplete');

    const params: Record<string, string> = {
      q: input,
      format: 'jsonv2',
      addressdetails: '0',
      limit: '6',
    };
    if (country) params.countrycodes = country.toLowerCase();

    const results = await nominatimFetch<any[]>('/search', params);

    return results
      .filter((r) => r.osm_type && r.osm_id)
      .map((r) => ({
        place_id: `${String(r.osm_type)[0]!.toUpperCase()}${r.osm_id}`,
        description: r.display_name as string,
      }));
  });
}
