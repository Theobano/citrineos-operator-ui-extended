// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { Button } from '@lib/client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lib/client/components/ui/card';
import { Input } from '@lib/client/components/ui/input';
import { Label } from '@lib/client/components/ui/label';
import { Badge } from '@lib/client/components/ui/badge';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export const ProfileCard: React.FC = () => {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user.name) setName(session.user.name);
  }, [session?.user.name]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await authClient.updateUser({ name });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message || 'Could not update profile');
      return;
    }
    toast.success('Profile updated');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Signed in as {session?.user.email}
          {(session?.user as { role?: string | null } | undefined)?.role && (
            <Badge variant="secondary" className="ml-2">
              {(session?.user as { role?: string | null }).role}
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="flex max-w-sm flex-col gap-3">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={saving} className="self-start">
            {saving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export const PasswordCard: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revoke, setRevoke] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    const res = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: revoke,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message || 'Could not change password');
      return;
    }
    toast.success('Password changed');
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Use at least 8 characters. Other sessions are signed out by default.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex max-w-sm flex-col gap-3">
          <Input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={revoke}
              onChange={(e) => setRevoke(e.target.checked)}
            />
            Sign out other sessions
          </label>
          <Button type="submit" disabled={saving} className="self-start">
            {saving && <Loader2 className="animate-spin" />}
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

type SessionRow = {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
};

export const SessionsCard: React.FC = () => {
  const { data: current } = authClient.useSession();
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const load = useCallback(async () => {
    const res = await authClient.listSessions();
    setSessions((res.data ?? []) as SessionRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (token: string) => {
    const res = await authClient.revokeSession({ token });
    if (res.error) {
      toast.error(res.error.message || 'Could not revoke session');
      return;
    }
    toast.success('Session revoked');
    load();
  };

  const revokeOthers = async () => {
    await authClient.revokeOtherSessions();
    toast.success('Other sessions revoked');
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
        <CardDescription>Devices currently signed in.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="divide-y rounded-md border">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {s.userAgent || 'Unknown device'}
                  {s.token === current?.session.token && (
                    <Badge variant="outline" className="ml-2">
                      This device
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.ipAddress || 'Unknown IP'} · started{' '}
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              {s.token !== current?.session.token && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revoke(s.token)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={revokeOthers}
            className="self-start"
          >
            Sign out all other sessions
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
