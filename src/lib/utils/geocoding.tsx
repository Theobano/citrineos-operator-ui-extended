// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import type { LocationDto } from '@citrineos/base';

export const getFullAddress = (location: Partial<LocationDto>) => {
  return `${location.address || ''}, ${location.city || ''}, ${
    location.state || ''
  } ${location.postalCode || ''}, ${location.country || ''}`.trim();
};
