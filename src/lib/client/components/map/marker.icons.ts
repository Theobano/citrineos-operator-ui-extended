// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import L from 'leaflet';

export type MarkerStatus = 'online' | 'offline' | 'partial';

const statusColors: Record<MarkerStatus, string> = {
  online: '#16a34a',
  partial: '#f59e0b',
  offline: '#6b7280',
};

/** Circular pin with a charger bolt, coloured by status. */
export const createStatusIcon = (status: MarkerStatus = 'online') =>
  L.divIcon({
    className: 'citrine-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `<div style="width:36px;height:36px;border-radius:9999px;background:${statusColors[status]};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>
    </div>`,
  });

export const createPickerIcon = () =>
  L.divIcon({
    className: 'citrine-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    html: `<svg width="32" height="42" viewBox="0 0 24 24" fill="#e11d48" stroke="#fff" stroke-width="1"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>`,
  });
