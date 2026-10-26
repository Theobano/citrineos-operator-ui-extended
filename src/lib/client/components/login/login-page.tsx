// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { authClient } from '@lib/auth/auth-client';
import { Logo } from '@lib/client/components/title';
import { Alert, AlertDescription } from '@lib/client/components/ui/alert';
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
import config from '@lib/utils/config';
import { setPasskeyDeviceState } from '@lib/utils/passkey-device';
import { useLogin } from '@refinedev/core';
import { Fingerprint, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const isKeycloak = config.authProvider === 'keycloak';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const { mutate: login, isPending } = useLogin();
  const router = useRouter();

  useEffect(() => {
    if (isKeycloak) login({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offer saved passkeys in the browser's autofill (conditional UI).
  useEffect(() => {
    if (isKeycloak) return;
    authClient.signIn
      .passkey({ autoFill: true })
      .then((res) => {
        if (res && !res.error) {
          const id = res.data?.user?.id;
          if (id) setPasskeyDeviceState(id, 'registered');
          router.push('/overview');
        }
      })
      .catch(() => undefined);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login(
      { email, password },
      {
        onSuccess: (res) => {
          if (res && !res.success) {
            setError(res.error?.message || 'Invalid email or password');
          }
        },
      },
    );
  };

  const onPasskey = async () => {
    setError(null);
    setPasskeyLoading(true);
    const res = await authClient.signIn.passkey();
    setPasskeyLoading(false);
    if (res?.error) {
      setError(res.error.message || 'Passkey sign-in failed');
    } else if (res?.data) {
      const id = res.data.user?.id;
      if (id) setPasskeyDeviceState(id, 'registered');
      // window.location.href = '/overview';
      router.push('/overview');
    }
  };

  if (isKeycloak) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>Redirecting to single sign-on…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>
              Sign in to manage your charging network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username webauthn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password webauthn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Sign in
              </Button>
            </form>
            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-card px-2">or</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onPasskey}
              disabled={passkeyLoading}
            >
              {passkeyLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Fingerprint />
              )}
              Sign in with a passkey
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
