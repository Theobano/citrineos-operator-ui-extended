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
import {
  createAccountFromInvitationAction,
  getInvitationAction,
  type InvitationInfo,
} from '@lib/server/actions/invitations';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending } = authClient.useSession();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInvitationAction(id).then((res) => {
      if (res.data) setInfo(res.data);
      else setError(res.error ?? 'Invitation not found.');
    });
  }, [id]);

  useEffect(() => {
    if (session) window.location.replace(`/accept-invitation/${id}`);
  }, [session, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    const created = await createAccountFromInvitationAction({
      invitationId: id,
      name,
      password,
    });
    if (created.error) {
      setBusy(false);
      toast.error(created.error);
      return;
    }
    const signedIn = await authClient.signIn.email({
      email: info.email,
      password,
    });
    if (signedIn.error) {
      setBusy(false);
      toast.error(signedIn.error.message || 'Could not sign in');
      return;
    }
    const accepted = await authClient.organization.acceptInvitation({
      invitationId: id,
    });
    if (accepted.error) {
      setBusy(false);
      toast.error(accepted.error.message || 'Could not accept the invitation');
      return;
    }
    window.location.href = '/overview';
  };

  return (
    <div className="mx-auto mt-16 max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {info ? `Join ${info.organizationName}` : 'Invitation'}
          </CardTitle>
          <CardDescription>
            {error ??
              (info
                ? info.userExists
                  ? 'You already have an account. Sign in to accept the invitation.'
                  : 'Create your account to accept the invitation.'
                : 'Loading…')}
          </CardDescription>
        </CardHeader>
        {info && !isPending && !session && (
          <CardContent>
            {info.userExists ? (
              <Button asChild>
                <a href="/login">Sign in</a>
              </Button>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={info.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Name</Label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Password</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  Create account
                </Button>
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
