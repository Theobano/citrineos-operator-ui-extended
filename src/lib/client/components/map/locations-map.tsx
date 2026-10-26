// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import type { LocationDto } from '@citrineos/base';
import { Skeleton } from '@lib/client/components/ui/skeleton';
import dynamic from 'next/dynamic';
import React from 'react';

const Client = dynamic(() => import('./locations-map.client'), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

export const LocationsMap: React.FC<{ locations: LocationDto[] }> = ({
  locations,
}) => (
  <div className="size-full">
    <Client locations={locations} />
  </div>
);
