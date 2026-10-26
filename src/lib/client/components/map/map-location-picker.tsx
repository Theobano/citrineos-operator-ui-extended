// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Skeleton } from '@lib/client/components/ui/skeleton';
import type { GeoPoint } from '@lib/utils/GeoPoint';
import dynamic from 'next/dynamic';
import React from 'react';

export const defaultLatitude = 36.7783;
export const defaultLongitude = -119.4179;

export interface LocationPickerMapProps {
  point?: GeoPoint;
  zoom?: number;
  onLocationSelect: (point: GeoPoint) => void;
}

const Client = dynamic(() => import('./map-location-picker.client'), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

/** Click (or drag the pin) to choose a location on an OpenStreetMap map. */
export const MapLocationPicker: React.FC<LocationPickerMapProps> = (props) => (
  <div className="size-full">
    <Client {...props} />
  </div>
);
