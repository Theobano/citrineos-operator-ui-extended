// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import {
  isAppAdmin,
  ORG_ROLES,
  splitRoles,
  type OrgRole,
} from '@lib/auth/permissions';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lib/client/components/ui/tabs';
import {
  createMemberAction,
  resetMemberPasswordAction,
} from '@lib/server/actions/org-members';
import { heading2Style, pageFlex, pageMargin } from '@lib/client/styles/page';
import { Copy, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type Member = {
  id: string;
  userId: string;
  role: string;
  createdAt: Date | string;
  user: { id: string; name: string; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
};

export const OrganizationPage: React.FC = () => {
  const { data: session } = authClient.useSession();
  const { data: active } = authClient.useActiveOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', role: 'operator' });
  const [addOpen, setAddOpen] = useState(false);
  const [add, setAdd] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [pwTarget, setPwTarget] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const organizationId = active?.id;
  const me = members.find((m) => m.userId === session?.user.id);
  const canManage =
    splitRoles(me?.role).includes('admin') ||
    isAppAdmin((session?.user as { role?: string | null } | undefined)?.role);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const res = await authClient.organization.getFullOrganization({
      query: { organizationId },
    });
    setMembers((res.data?.members ?? []) as unknown as Member[]);
    setInvitations(
      ((res.data?.invitations ?? []) as unknown as Invitation[]).filter(
        (i) => i.status === 'pending',
      ),
    );
    setOrgName(res.data?.name ?? '');
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!active) {
    return (
      <div className={`${pageMargin} ${pageFlex}`}>
        <h2 className={heading2Style}>Organization</h2>
        <p className="text-sm text-muted-foreground">
          You are not a member of an organization. Ask an administrator to add
          you to one.
        </p>
      </div>
    );
  }

  if (!loading && !canManage) {
    return (
      <div className={`${pageMargin} ${pageFlex}`}>
        <h2 className={heading2Style}>Organization</h2>
        <p className="text-sm text-muted-foreground">
          Only organization or application admins can manage organization
          settings.
        </p>
      </div>
    );
  }

  const run = async (
    p: Promise<{ error?: { message?: string } | null }>,
    ok: string,
  ) => {
    const res = await p;
    if (res.error) {
      toast.error(res.error.message || 'Action failed');
      return false;
    }
    toast.success(ok);
    load();
    return true;
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      authClient.organization.inviteMember({
        email: invite.email,
        role: invite.role as OrgRole,
        organizationId,
      }),
      'Invitation created',
    );
    if (ok) {
      setInviteOpen(false);
      setInvite({ email: '', role: 'operator' });
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    const res = await createMemberAction({
      organizationId,
      ...add,
      role: add.role as OrgRole,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Member added');
    setAddOpen(false);
    setAdd({ name: '', email: '', password: '', role: 'operator' });
    load();
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTarget || !organizationId) return;
    const res = await resetMemberPasswordAction({
      organizationId,
      userId: pwTarget.userId,
      newPassword,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Password reset; the user has been signed out');
    setPwTarget(null);
    setNewPassword('');
  };

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(
      `${window.location.origin}/invite/${id}`,
    );
    toast.success('Invitation link copied');
  };

  const roleSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORG_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={`${pageMargin} ${pageFlex}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={heading2Style}>{active.name}</h2>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              Invite
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add member
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="members" className="gap-4">
        <TabsList>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.length})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      <Loader2 className="mx-auto animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  members.map((m) => {
                    const isSelf = m.userId === session?.user.id;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {m.user.name}
                        </TableCell>
                        <TableCell>{m.user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{m.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Member actions"
                                >
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ORG_ROLES.filter((r) => r !== m.role).map(
                                  (r) => (
                                    <DropdownMenuItem
                                      key={r}
                                      disabled={isSelf}
                                      onClick={() =>
                                        run(
                                          authClient.organization.updateMemberRole(
                                            {
                                              memberId: m.id,
                                              role: r,
                                              organizationId,
                                            },
                                          ),
                                          `Role set to ${r}`,
                                        )
                                      }
                                    >
                                      Make {r}
                                    </DropdownMenuItem>
                                  ),
                                )}
                                <DropdownMenuItem
                                  onClick={() => setPwTarget(m)}
                                >
                                  Reset password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={isSelf}
                                  onClick={() => {
                                    if (!confirm(`Remove ${m.user.email}?`))
                                      return;
                                    run(
                                      authClient.organization.removeMember({
                                        memberIdOrEmail: m.id,
                                        organizationId,
                                      }),
                                      'Member removed',
                                    );
                                  }}
                                >
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="invitations">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      No pending invitations
                    </TableCell>
                  </TableRow>
                )}
                {invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{i.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(i.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(i.id)}
                      >
                        <Copy /> Link
                      </Button>
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            run(
                              authClient.organization.cancelInvitation({
                                invitationId: i.id,
                              }),
                              'Invitation cancelled',
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <form
            className="flex max-w-sm flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                authClient.organization.update({
                  data: { name: orgName },
                  organizationId,
                }),
                'Organization updated',
              );
            }}
          >
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={orgName}
              disabled={!canManage}
              onChange={(e) => setOrgName(e.target.value)}
            />
            {canManage && (
              <Button type="submit" className="self-start">
                Save
              </Button>
            )}
          </form>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
          </DialogHeader>
          <form onSubmit={sendInvite} className="flex flex-col gap-4">
            <Input
              type="email"
              required
              placeholder="Email"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            {roleSelect(invite.role, (role) => setInvite({ ...invite, role }))}
            <DialogFooter>
              <Button type="submit">Send invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <form onSubmit={addMember} className="flex flex-col gap-4">
            <Input
              required
              placeholder="Name"
              value={add.name}
              onChange={(e) => setAdd({ ...add, name: e.target.value })}
            />
            <Input
              type="email"
              required
              placeholder="Email"
              value={add.email}
              onChange={(e) => setAdd({ ...add, email: e.target.value })}
            />
            <Input
              type="password"
              required
              minLength={8}
              placeholder="Temporary password"
              value={add.password}
              onChange={(e) => setAdd({ ...add, password: e.target.value })}
            />
            {roleSelect(add.role, (role) => setAdd({ ...add, role }))}
            <DialogFooter>
              <Button type="submit">Create member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {pwTarget?.user.email}</DialogTitle>
          </DialogHeader>
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <Input
              type="password"
              required
              minLength={8}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <DialogFooter>
              <Button type="submit">Reset password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
