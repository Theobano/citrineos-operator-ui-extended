// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import React, { useState } from 'react';
import {
  type CrudFilter,
  type CrudSorting,
  useDataProvider,
} from '@refinedev/core';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@lib/client/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lib/client/components/ui/dropdown-menu';

const PAGE_SIZE = 500;
const MAX_ROWS = 50000;

type ExportFormat = 'csv' | 'json';

type ExportButtonProps = {
  resource: string;
  gqlQuery: any;
  filters?: CrudFilter[];
  sorters?: CrudSorting;
  filename?: string;
};

const flatten = (
  value: any,
  prefix = '',
  out: Record<string, any> = {},
): Record<string, any> => {
  if (value === null || value === undefined) {
    if (prefix) out[prefix] = '';
    return out;
  }
  if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value);
    return out;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === '__typename') continue;
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
};

const csvCell = (v: any) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (rows: Record<string, any>[]) => {
  const headers: string[] = [];
  const seen = new Set<string>();
  rows.forEach((r) =>
    Object.keys(r).forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k);
        headers.push(k);
      }
    }),
  );
  return [
    headers.map(csvCell).join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ].join('\r\n');
};

const download = (content: string, mime: string, name: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Exports every row matching the current filters/sorters (paged through the
 * data provider, so it uses the same GraphQL query as the list) as CSV or JSON.
 */
export const ExportButton = ({
  resource,
  gqlQuery,
  filters = [],
  sorters,
  filename,
}: ExportButtonProps) => {
  const getDataProvider = useDataProvider();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(true);
    setError(null);
    try {
      const dataProvider = getDataProvider();
      const rows: any[] = [];
      for (let current = 1; rows.length < MAX_ROWS; current++) {
        const res = await dataProvider.getList({
          resource,
          pagination: {
            currentPage: current,
            pageSize: PAGE_SIZE,
            mode: 'server',
          },
          filters,
          sorters: sorters ?? [{ field: 'updatedAt', order: 'desc' }],
          meta: { gqlQuery },
        });
        rows.push(...res.data);
        if (res.data.length < PAGE_SIZE || rows.length >= res.total) break;
      }
      const clean = rows.map((r) => JSON.parse(JSON.stringify(r)));
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const base = `${filename ?? resource}-${stamp}`;
      if (format === 'json') {
        download(
          JSON.stringify(
            clean,
            (k, v) => (k === '__typename' ? undefined : v),
            2,
          ),
          'application/json',
          `${base}.json`,
        );
      } else {
        download(
          toCsv(clean.map((r) => flatten(r))),
          'text/csv;charset=utf-8',
          `${base}.csv`,
        );
      }
    } catch (e: any) {
      setError(e?.message ?? 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy} title={error ?? undefined}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run('json')}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
