// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { Button } from '@lib/client/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@lib/client/components/ui/dialog';
import config from '@lib/utils/config';
import {
  describeDevice,
  getPasskeyDeviceState,
  isPasskeyPromptSnoozed,
  isPasskeySupported,
  setPasskeyDeviceState,
  snoozePasskeyPrompt,
} from '@lib/utils/passkey-device';
import { Fingerprint, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * After signing in on a device that has no passkey registered for the user,
 * offers to register one so the next sign-in can use biometrics / a device PIN.
 */
export const PasskeyPrompt: React.FC = () => {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || config.authProvider === 'keycloak') return;
    if (!isPasskeySupported()) return;
    if (getPasskeyDeviceState(userId) || isPasskeyPromptSnoozed(userId)) return;
    let cancelled = false;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((available) => {
        if (available && !cancelled) setOpen(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  const later = () => {
    snoozePasskeyPrompt(userId);
    setOpen(false);
  };

  const never = () => {
    setPasskeyDeviceState(userId, 'declined');
    setOpen(false);
  };

  const register = async () => {
    setBusy(true);
    const res = await authClient.passkey.addPasskey({ name: describeDevice() });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error.message || 'Could not register passkey');
      later();
      return;
    }
    setPasskeyDeviceState(userId, 'registered');
    toast.success('Passkey registered on this device');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && later()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="size-5" /> Sign in faster with a passkey
          </DialogTitle>
          <DialogDescription>
            No passkey is registered on this device yet. Register one to sign in
            next time with your fingerprint, face or device PIN instead of a
            password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={never} disabled={busy}>
            Don&apos;t ask again
          </Button>
          <Button variant="outline" onClick={later} disabled={busy}>
            Not now
          </Button>
          <Button onClick={register} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Register passkey
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
