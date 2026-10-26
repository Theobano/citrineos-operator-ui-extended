// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronsUpDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslate } from '@refinedev/core';
import { authClient } from '@lib/auth/auth-client';
import { authProvider } from '@lib/providers/auth-provider';
import { sidebarIconSize } from '@lib/client/styles/icon';
import { cn } from '@lib/utils/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@lib/client/components/ui/dropdown-menu';

const Avatar = ({ name, image }: { name: string; image?: string | null }) => (
  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-medium uppercase text-accent-foreground">
    {image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name} className="size-full object-cover" />
    ) : (
      name.charAt(0)
    )}
  </span>
);

export const NavUser = ({ expanded }: { expanded: boolean }) => {
  const router = useRouter();
  const translate = useTranslate();
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  const user = session?.user;
  const name = user?.name || user?.email || '?';

  const logout = () => {
    authProvider.logout({}).then((authResponse) => {
      toast.success(translate('loggedOut'));
      router.push(authResponse.redirectTo ?? '');
    });
  };

  const switchOrganization = async (organizationId: string) => {
    if (organizationId === activeOrganization?.id) return;
    const res = await authClient.organization.setActive({ organizationId });
    if (res.error) {
      toast.error(res.error.message || 'Could not switch organization');
      return;
    }
    // Hasura headers (tenant) are derived from the active organization.
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={expanded ? undefined : name}
          className={cn(
            'flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent',
            !expanded && 'justify-center',
          )}
        >
          <Avatar name={name} image={user?.image} />
          {expanded && (
            <>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrganization?.name ?? user?.email}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64"
        side="right"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-sm">
            <Avatar name={name} image={user?.image} />
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Building2 className={sidebarIconSize} />
              <span className="truncate">
                {activeOrganization?.name ?? 'Switch organization'}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              {organizations?.length ? (
                organizations.map((organization) => (
                  <DropdownMenuItem
                    key={organization.id}
                    onSelect={() => switchOrganization(organization.id)}
                  >
                    <span className="truncate">{organization.name}</span>
                    {organization.id === activeOrganization?.id && (
                      <Check className="ml-auto size-4" />
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No organizations</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => router.push('/account')}>
            <Settings className={sidebarIconSize} />
            Account
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout}>
          <LogOut className={sidebarIconSize} />
          {translate('buttons.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
