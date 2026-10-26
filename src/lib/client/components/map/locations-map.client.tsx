// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import type { LocationDto } from '@citrineos/base';
import { MenuSection } from '@lib/client/components/main-menu/main.menu';
import { BaseMap } from '@lib/client/components/map/base-map';
import {
  createStatusIcon,
  type MarkerStatus,
} from '@lib/client/components/map/marker.icons';
import { ChargingStationStatusTag } from '@lib/client/pages/charging-stations/charging.station.status.tag';
import type { LatLngBoundsExpression } from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import Link from 'next/link';
import React, { useEffect, useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

const locationStatus = (location: LocationDto): MarkerStatus => {
  const pool = location.chargingPool ?? [];
  if (pool.length === 0) return 'offline';
  const online = pool.filter((s) => s.isOnline).length;
  if (online === pool.length) return 'online';
  return online === 0 ? 'offline' : 'partial';
};

const FitToLocations: React.FC<{ bounds?: LatLngBoundsExpression }> = ({
  bounds,
}) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [map, bounds]);
  return null;
};

/** Clustered overview map of all locations (client-only; load via LocationsMap). */
export default function LocationsMapClient({
  locations,
}: {
  locations: LocationDto[];
}) {
  const located = useMemo(
    () => locations.filter((l) => l.coordinates?.coordinates),
    [locations],
  );
  const bounds = useMemo<LatLngBoundsExpression | undefined>(
    () =>
      located.length
        ? located.map(
            (l) =>
              [
                l.coordinates.coordinates[1]!,
                l.coordinates.coordinates[0]!,
              ] as [number, number],
          )
        : undefined,
    [located],
  );

  return (
    <BaseMap>
      <FitToLocations bounds={bounds} />
      <MarkerClusterGroup chunkedLoading>
        {located.map((location) => (
          <Marker
            key={location.id}
            position={[
              location.coordinates.coordinates[1]!,
              location.coordinates.coordinates[0]!,
            ]}
            icon={createStatusIcon(locationStatus(location))}
          >
            <Popup minWidth={220}>
              <div className="flex flex-col gap-2 text-foreground">
                <Link
                  href={`/${MenuSection.LOCATIONS}/${location.id}`}
                  className="text-base font-semibold underline"
                >
                  {location.name}
                </Link>
                {(location.chargingPool ?? []).length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No chargers.
                  </span>
                )}
                {(location.chargingPool ?? []).map((charger) => (
                  <div
                    key={charger.id}
                    className="flex flex-col gap-1 rounded-md border p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/${MenuSection.CHARGING_STATIONS}/${charger.id}`}
                        className="font-medium underline"
                      >
                        {charger.ocppConnectionName}
                      </Link>
                      <span
                        className={
                          charger.isOnline
                            ? 'text-xs text-success'
                            : 'text-xs text-destructive'
                        }
                      >
                        {charger.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {charger.evses && charger.evses.length > 0 && (
                      <ChargingStationStatusTag station={charger} />
                    )}
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </BaseMap>
  );
}
