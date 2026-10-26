// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@lib/client/components/ui/button';
import { Monitor, Moon, Sun } from 'lucide-react';
import { sidebarIconSize } from '@lib/client/styles/icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lib/client/components/ui/tooltip';
import { useEffect, useState } from 'react';

const ORDER = ['system', 'light', 'dark'] as const;
type ThemeChoice = (typeof ORDER)[number];

const LABELS: Record<ThemeChoice, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

const ICONS: Record<ThemeChoice, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export const ThemeToggle = ({ expanded }: { expanded: boolean }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const current: ThemeChoice = ORDER.includes(theme as ThemeChoice)
    ? (theme as ThemeChoice)
    : 'system';
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={expanded ? 'default' : 'icon'}
            className="w-full justify-start"
            onClick={() => setTheme(next)}
          >
            <Icon className={sidebarIconSize} />
            {expanded && <span>{LABELS[current]}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Switch to {LABELS[next]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
