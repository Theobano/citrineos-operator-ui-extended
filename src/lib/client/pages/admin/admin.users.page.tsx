// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { Badge } from '@lib/client/components/ui/badge';
import { Button } from '@lib/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lib/client/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lib/client/components/ui/dropdown-menu';
import { Input } from '@lib/client/components/ui/input';
import { Label } from '@lib/client/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lib/client/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@lib/client/components/ui/table';
import { heading2Style, pageFlex, pageMargin } from '@lib/client/styles/page';
import { Loader2, MoreHorizontal, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { APP_ROLES, isSuperAdmin, type AppRole } from '@lib/auth/permissions';
import { useRouter } from 'next/navigation';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt: Date | string;
};

const ROLES: readonly AppRole[] = APP_ROLES;

export const AdminUsersPage: React.FC = () => {
  const { data: session } = authClient.useSession();
  const canManageSuperadmins = isSuperAdmin(
    (session?.user as { role?: string | null } | undefined)?.role,
  );
  const assignableRoles = ROLES.filter(
    (r) => r !== 'superadmin' || canManageSuperadmins,
  );
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authClient.admin.listUsers({
      query: {
        limit: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc',
        ...(search
          ? {
              searchValue: search,
              searchField: 'email' as const,
              searchOperator: 'contains' as const,
            }
          : {}),
      },
    });
    if (res.error) toast.error(res.error.message || 'Could not load users');
    setUsers((res.data?.users ?? []) as AdminUser[]);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    const res = await authClient.admin.setUserPassword({
      userId: passwordTarget.id,
      newPassword,
    });
    if (res.error) {
      toast.error(res.error.message || 'Could not set password');
      return;
    }
    toast.success('Password updated');
    setPasswordTarget(null);
    setNewPassword('');
  };

  const run = async (
    action: Promise<{ error?: { message?: string } | null }>,
    success: string,
  ) => {
    const res = await action;
    if (res.error) {
      toast.error(res.error.message || 'Action failed');
      return;
    }
    toast.success(success);
    load();
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await authClient.admin.createUser({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role as AppRole,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message || 'Could not create user');
      return;
    }
    toast.success('User created');
    setDialogOpen(false);
    setForm({ name: '', email: '', password: '', role: 'user' });
    load();
  };

  return (
    <div className={`${pageMargin} ${pageFlex}`}>
      <div className="flex items-center justify-between">
        <h2 className={heading2Style}>Users</h2>
        <Input
          className="max-w-xs"
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> New user
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <Loader2 className="mx-auto animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              users.map((u) => {
                const isSelf = u.id === session?.user.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.role ?? 'user'}</Badge>
                    </TableCell>
                    <TableCell>
                      {u.banned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="User actions"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {assignableRoles
                            .filter((r) => r !== (u.role ?? 'user'))
                            .map((r) => (
                              <DropdownMenuItem
                                key={r}
                                disabled={isSelf}
                                onClick={() =>
                                  run(
                                    authClient.admin.setRole({
                                      userId: u.id,
                                      role: r,
                                    }),
                                    `Role set to ${r}`,
                                  )
                                }
                              >
                                Make {r}
                              </DropdownMenuItem>
                            ))}
                          <DropdownMenuItem
                            onClick={() => setPasswordTarget(u)}
                          >
                            Set password
                          </DropdownMenuItem>
                          {u.banned ? (
                            <DropdownMenuItem
                              onClick={() =>
                                run(
                                  authClient.admin.unbanUser({ userId: u.id }),
                                  'User unbanned',
                                )
                              }
                            >
                              Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={isSelf}
                              onClick={() =>
                                run(
                                  authClient.admin.banUser({ userId: u.id }),
                                  'User banned',
                                )
                              }
                            >
                              Ban
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            disabled={isSelf}
                            onClick={async () => {
                              const res =
                                await authClient.admin.impersonateUser({
                                  userId: u.id,
                                });
                              if (res.error) {
                                toast.error(
                                  res.error.message || 'Could not impersonate',
                                );
                                return;
                              }
                             router.push('/overview');
                            }}
                          >
                            Impersonate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={isSelf}
                            onClick={() => {
                              if (!confirm(`Delete ${u.email}?`)) return;
                              run(
                                authClient.admin.removeUser({ userId: u.id }),
                                'User deleted',
                              );
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
          </DialogHeader>
          <form onSubmit={createUser} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(o) => !o && setPasswordTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set password for {passwordTarget?.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPassword} className="flex flex-col gap-4">
            <Input
              type="password"
              required
              minLength={8}
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <DialogFooter>
              <Button type="submit">Update password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
