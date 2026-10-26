// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use server';

import { authedAction, type ActionResult } from '@lib/utils/action-guard';
import { nominatimFetch } from '@lib/server/clients/nominatim';

export interface PlaceDetailsResponse {
  id: string;
  formattedAddress: string;
  addressComponents: Array<{
    longText: string;
    shortText: string;
    types: string[];
  }>;
  location: {
    latitude: number;
    longitude: number;
  };
}

// OSM identifiers: node/way/relation prefix followed by digits.
const PLACE_ID_REGEX = /^[NWR]\d{1,15}$/;

/** Resolves an OSM identifier from autocompleteAddress into structured address data. */
export async function getPlaceDetails(
  placeId: string,
  _sessionToken?: string,
): Promise<ActionResult<PlaceDetailsResponse>> {
  return authedAction(async () => {
    if (!PLACE_ID_REGEX.test(placeId)) {
      throw new Error('Invalid place ID');
    }

    const results = await nominatimFetch<any[]>('/lookup', {
      osm_ids: placeId,
      format: 'jsonv2',
      addressdetails: '1',
    });
    const place = results[0];
    if (!place) throw new Error('Place not found');

    const a = place.address ?? {};
    const components: PlaceDetailsResponse['addressComponents'] = [];
    const add = (type: string, value?: string, short?: string) => {
      if (value) {
        components.push({
          longText: value,
          shortText: short ?? value,
          types: [type],
        });
      }
    };
    add('street_number', a.house_number);
    add('route', a.road ?? a.pedestrian ?? a.footway);
    add('locality', a.city ?? a.town ?? a.village ?? a.hamlet);
    add('administrative_area_level_2', a.county);
    add('administrative_area_level_1', a.state ?? a.region);
    add('postal_code', a.postcode);
    add('country', a.country, String(a.country_code ?? '').toUpperCase());

    return {
      id: placeId,
      formattedAddress: place.display_name,
      addressComponents: components,
      location: {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon),
      },
    };
  });
}
