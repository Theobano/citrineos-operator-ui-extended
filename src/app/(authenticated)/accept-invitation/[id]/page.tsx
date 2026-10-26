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
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(true);
    const res = accept
      ? await authClient.organization.acceptInvitation({ invitationId: id })
      : await authClient.organization.rejectInvitation({ invitationId: id });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message || 'Could not process the invitation');
      return;
    }
    toast.success(accept ? 'Invitation accepted' : 'Invitation declined');
    if (accept) window.location.href = '/organization';
    else router.push('/overview');
  };

  return (
    <div className="mx-auto mt-16 max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization invitation</CardTitle>
          <CardDescription>
            You have been invited to join an organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button disabled={busy} onClick={() => respond(true)}>
            Accept
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => respond(false)}
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
