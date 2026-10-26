// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Logo } from '@lib/client/components/title';
import { cn } from '@lib/utils/cn';
import {
  ArrowLeftRight,
  Building,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  EvCharger,
  HelpCircle,
  Home,
  MapPin,
  Menu,
  Receipt,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authClient } from '@lib/auth/auth-client';
import { isAppAdmin, splitRoles } from '@lib/auth/permissions';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@lib/client/components/ui/button';
import { sidebarIconSize } from '@lib/client/styles/icon';
import { ThemeToggle } from '@lib/client/components/theme-toggle';
import { ConnectionModal } from '@lib/client/components/modals/shared/connection-modal/connection.modal';
import { NavUser } from '@lib/client/components/nav-user';
import { useTranslate } from '@refinedev/core';

export enum MenuSection {
  OVERVIEW = 'overview',
  LOCATIONS = 'locations',
  CHARGING_STATIONS = 'charging-stations',
  AUTHORIZATIONS = 'authorizations',
  TRANSACTIONS = 'transactions',
  TARIFFS = 'tariffs',
  PARTNERS = 'partners',
  ACCOUNT = 'account',
  ADMIN = 'admin',
}

export interface MainMenuProps {
  activeSection: MenuSection;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export const MainMenu = ({ activeSection }: MainMenuProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const translate = useTranslate();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { data: activeMember } = authClient.useActiveMember();
  const isAdmin = isAppAdmin(
    (session?.user as { role?: string | null } | undefined)?.role,
  );
  const memberRoles = splitRoles(activeMember?.role);
  const canManageOrganization =
    isAdmin || memberRoles.includes('admin') || memberRoles.includes('owner');
  // The drawer is always fully expanded on small screens.
  const compact = collapsed && !mobileOpen;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCollapsed(true);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainMenuItems: MenuItem[] = [
    {
      key: `/${MenuSection.OVERVIEW}`,
      label: translate('menu.overview'),
      icon: <Home className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.LOCATIONS}`,
      label: translate('Locations.Locations'),
      icon: <MapPin className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.CHARGING_STATIONS}`,
      label: translate('ChargingStations.ChargingStations'),
      icon: <EvCharger className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.AUTHORIZATIONS}`,
      label: translate('Authorizations.Authorizations'),
      icon: <Clipboard className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.TRANSACTIONS}`,
      label: translate('Transactions.Transactions'),
      icon: <ArrowLeftRight className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.TARIFFS}`,
      label: translate('Tariffs.Tariffs'),
      icon: <Receipt className={sidebarIconSize} />,
    },
    {
      key: `/${MenuSection.PARTNERS}`,
      label: translate('TenantPartners.TenantPartners'),
      icon: <Users className={sidebarIconSize} />,
    },
  ];

  const adminMenuItems: MenuItem[] = isAdmin
    ? [
        {
          key: '/admin/users',
          label: 'Users',
          icon: <ShieldCheck className={sidebarIconSize} />,
        },
        {
          key: '/admin/organizations',
          label: 'Organizations',
          icon: <Building2 className={sidebarIconSize} />,
        },
      ]
    : [];
  const accountMenuItems: MenuItem[] = [
    ...(canManageOrganization
      ? [
          {
            key: '/organization',
            label: 'Organization',
            icon: <Building className={sidebarIconSize} />,
          },
        ]
      : []),
    {
      key: '/account',
      label: 'Account',
      icon: <UserCog className={sidebarIconSize} />,
    },
  ];
  const secondaryItems = [...adminMenuItems, ...accountMenuItems];

  const renderItem = (item: MenuItem, active: boolean) => (
    <li key={item.key}>
      <Link
        href={item.key}
        className={cn(
          'flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-sm',
          'hover:bg-accent hover:text-accent-foreground',
          active
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground',
          compact && 'justify-center px-2',
        )}
        title={compact ? item.label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {!compact && <span>{item.label}</span>}
      </Link>
    </li>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-card px-3 shadow-md md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className={sidebarIconSize} />
        </Button>
        <div className="flex h-full items-center">
          <Logo collapsed={false} />
        </div>
      </header>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 h-dvh bg-card transition-all duration-300 z-40 flex flex-col shadow-md',
          mobileOpen
            ? 'w-[272px] translate-x-0'
            : '-translate-x-full md:translate-x-0',
          !mobileOpen && (collapsed ? 'md:w-20' : 'md:w-[272px]'),
        )}
        ref={menuRef}
      >
        {/* Logo Section */}
        <div className="min-h-[130px] flex items-center justify-center px-4">
          <Logo collapsed={compact} />
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1 px-3">
            {mainMenuItems.map((item) =>
              renderItem(item, `/${activeSection}` === item.key),
            )}
          </ul>
          <ul className="mt-4 space-y-1 border-t border-border px-3 pt-4">
            {secondaryItems.map((item) =>
              renderItem(item, pathname?.startsWith(item.key) ?? false),
            )}
          </ul>
        </nav>

        {/* Bottom Menu - Help Link */}
        <div className="border-t border-border p-3 flex flex-col gap-2 items-center">
          <Button
            variant="ghost"
            onClick={() => setIsHelpOpen(true)}
            title="Help"
          >
            <HelpCircle className={sidebarIconSize} />
            {!compact && <span>{translate('menu.help')}</span>}
          </Button>
          <NavUser expanded={!compact} />
        </div>

        {/* Collapse Toggle (desktop) / close (mobile) */}
        <Button
          variant="link"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-0 right-0 transform translate-x-1/2 translate-y-[110px] size-8 bg-card text-accent-foreground border-transparent rounded-full shadow-md max-md:hidden"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className={sidebarIconSize} />
          ) : (
            <ChevronLeft className={sidebarIconSize} />
          )}
        </Button>
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="absolute right-2 top-2 md:hidden"
            aria-label="Close menu"
          >
            <X className={sidebarIconSize} />
          </Button>
        )}
      </aside>
      <ConnectionModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};
