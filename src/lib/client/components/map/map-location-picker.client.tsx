// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { BaseMap } from '@lib/client/components/map/base-map';
import { createPickerIcon } from '@lib/client/components/map/marker.icons';
import type { LocationPickerMapProps } from '@lib/client/components/map/map-location-picker';
import { GeoPoint } from '@lib/utils/GeoPoint';
import React, { useEffect } from 'react';
import { Marker, useMap, useMapEvents } from 'react-leaflet';

const ClickHandler: React.FC<{ onSelect: (p: GeoPoint) => void }> = ({
  onSelect,
}) => {
  useMapEvents({
    click: (e) => onSelect(new GeoPoint(e.latlng.lat, e.latlng.lng)),
  });
  return null;
};

const Recenter: React.FC<{ point?: GeoPoint }> = ({ point }) => {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.latitude, point.longitude]);
  }, [map, point]);
  return null;
};

export default function LocationPickerClient({
  point,
  zoom = 15,
  onLocationSelect,
}: LocationPickerMapProps) {
  return (
    <BaseMap
      center={point ? [point.latitude, point.longitude] : undefined}
      zoom={point ? zoom : 4}
    >
      <ClickHandler onSelect={onLocationSelect} />
      <Recenter point={point} />
      {point && (
        <Marker
          position={[point.latitude, point.longitude]}
          icon={createPickerIcon()}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onLocationSelect(new GeoPoint(lat, lng));
            },
          }}
        />
      )}
    </BaseMap>
  );
}
