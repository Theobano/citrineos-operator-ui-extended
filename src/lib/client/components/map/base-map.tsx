// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import config from '@lib/utils/config';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import React from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';

export const defaultMapCenter: [number, number] = [
  config.defaultMapCenterLatitude,
  config.defaultMapCenterLongitude,
];

interface BaseMapProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Shared OpenStreetMap container. Tile servers and attribution are
 * configurable via NEXT_PUBLIC_MAP_TILE_* env variables. Must only be
 * rendered client-side (import through the dynamic wrappers).
 */
export const BaseMap: React.FC<BaseMapProps> = ({
  center = defaultMapCenter,
  zoom = 4,
  className,
  children,
}) => {
  const { resolvedTheme } = useTheme();
  const tileUrl =
    resolvedTheme === 'dark' ? config.mapTileUrlDark : config.mapTileUrl;
  // The default dark map reuses the OSM tiles and darkens them with a CSS filter.
  const darkenTiles =
    resolvedTheme === 'dark' && config.mapTileUrlDark === config.mapTileUrl;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      zoomControl={false}
      className={className ?? 'size-full rounded-lg z-0'}
    >
      <TileLayer
        key={`${tileUrl}-${darkenTiles}`}
        url={tileUrl}
        className={darkenTiles ? 'osm-dark-tiles' : undefined}
        attribution={config.mapTileAttribution}
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      {children}
    </MapContainer>
  );
};
