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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lib/client/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lib/client/components/ui/tabs';
import { heading2Style, pageFlex, pageMargin } from '@lib/client/styles/page';
import { Fingerprint, Loader2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { setPasskeyDeviceState } from '@lib/utils/passkey-device';
import { PreferencesCard } from './account.preferences';
import { PasswordCard, ProfileCard, SessionsCard } from './account.security';

const PasskeysCard: React.FC = () => {
  const { data: passkeys, refetch } = authClient.useListPasskeys();
  const { data: session } = authClient.useSession();
  const [passkeyName, setPasskeyName] = useState('');
  const [adding, setAdding] = useState(false);

  const addPasskey = async () => {
    setAdding(true);
    const res = await authClient.passkey.addPasskey({
      name: passkeyName || undefined,
    });
    setAdding(false);
    if (res?.error) {
      toast.error(res.error.message || 'Could not register passkey');
      return;
    }
    setPasskeyName('');
    toast.success('Passkey added');
    const id = session?.user.id;
    if (id) setPasskeyDeviceState(id, 'registered');
    refetch();
  };

  const removePasskey = async (id: string) => {
    const res = await authClient.passkey.deletePasskey({ id });
    if (res.error) {
      toast.error(res.error.message || 'Could not delete passkey');
      return;
    }
    toast.success('Passkey removed');
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Sign in without a password using your device&apos;s biometrics or a
          security key.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Passkey name (e.g. MacBook Touch ID)"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={addPasskey} disabled={adding}>
            {adding ? <Loader2 className="animate-spin" /> : <Fingerprint />}
            Add passkey
          </Button>
        </div>
        <ul className="divide-y rounded-md border">
          {(passkeys ?? []).length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              No passkeys registered yet.
            </li>
          )}
          {(passkeys ?? []).map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div>
                <div className="font-medium">
                  {pk.name || 'Unnamed passkey'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete passkey"
                onClick={() => removePasskey(pk.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const OrganizationsCard: React.FC = () => {
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const switchOrganization = async (organizationId: string) => {
    const res = await authClient.organization.setActive({ organizationId });
    if (res.error) {
      toast.error(res.error.message || 'Could not switch organization');
      return;
    }
    // Hasura headers (tenant) are derived from the active organization.
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active organization</CardTitle>
        <CardDescription>
          The active organization determines which tenant&apos;s data you see.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={activeOrganization?.id ?? ''}
          onValueChange={switchOrganization}
        >
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations?.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
};

export const AccountPage: React.FC = () => (
  <div className={`${pageMargin} ${pageFlex} max-w-3xl`}>
    <h2 className={heading2Style}>Account settings</h2>
    <Tabs defaultValue="profile" className="gap-4">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="organizations">Organizations</TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="flex flex-col gap-4">
        <ProfileCard />
      </TabsContent>
      <TabsContent value="security" className="flex flex-col gap-4">
        <PasswordCard />
        <PasskeysCard />
        <SessionsCard />
      </TabsContent>
      <TabsContent value="preferences" className="flex flex-col gap-4">
        <PreferencesCard />
      </TabsContent>
      <TabsContent value="organizations" className="flex flex-col gap-4">
        <OrganizationsCard />
      </TabsContent>
    </Tabs>
  </div>
);
