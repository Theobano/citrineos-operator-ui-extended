// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Button } from '@lib/client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lib/client/components/ui/card';
import { Label } from '@lib/client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lib/client/components/ui/select';
import { Switch } from '@lib/client/components/ui/switch';
import {
  getPreferencesAction,
  savePreferencesAction,
  type UserPreferences,
} from '@lib/server/actions/preferences';
import { useTheme } from 'next-themes';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const START_PAGES = [
  ['/overview', 'Overview'],
  ['/locations', 'Locations'],
  ['/charging-stations', 'Charging stations'],
  ['/transactions', 'Transactions'],
];

export const PreferencesCard: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<UserPreferences>({
    dateFormat: 'locale',
    pageSize: 20,
    compactTables: false,
    startPage: '/overview',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPreferencesAction().then((res) => {
      if (res.success) setPrefs(res.data);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await savePreferencesAction(prefs);
    setSaving(false);
    if (res.success) {
      setPrefs(res.data);
      localStorage.setItem('userPreferences', JSON.stringify(res.data));
      toast.success('Preferences saved');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Appearance and display defaults for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex max-w-sm flex-col gap-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select value={theme ?? 'system'} onValueChange={setTheme}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Browser default</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date format</Label>
          <Select
            value={prefs.dateFormat}
            onValueChange={(v) =>
              setPrefs({ ...prefs, dateFormat: v as 'locale' | 'iso' })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="locale">Browser locale</SelectItem>
              <SelectItem value="iso">ISO 8601</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Rows per page</Label>
          <Select
            value={String(prefs.pageSize)}
            onValueChange={(v) => setPrefs({ ...prefs, pageSize: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Start page</Label>
          <Select
            value={prefs.startPage}
            onValueChange={(v) => setPrefs({ ...prefs, startPage: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {START_PAGES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="compact"
            checked={!!prefs.compactTables}
            onCheckedChange={(v) => setPrefs({ ...prefs, compactTables: v })}
          />
          <Label htmlFor="compact">Compact tables</Label>
        </div>
        <Button onClick={save} disabled={saving} className="self-start">
          Save preferences
        </Button>
      </CardContent>
    </Card>
  );
};
