// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
'use client';

import config from '@lib/utils/config';
import { cn } from '@lib/utils/cn';
import React from 'react';

export interface LogoProps {
  /** Show only the compact icon (used by the collapsed sidebar). */
  collapsed?: boolean;
  className?: string;
}

/**
 * Brand logo. Replace it without touching code by setting
 * NEXT_PUBLIC_LOGO_URL (and optionally NEXT_PUBLIC_LOGO_DARK_URL /
 * NEXT_PUBLIC_LOGO_ICON_URL) to a path under /public or any absolute URL.
 * Light/dark variants are switched with CSS so there is no hydration flash.
 */
export const Logo: React.FC<LogoProps> = ({ collapsed = false, className }) => {
  const alt = `${config.appName} logo`;

  if (collapsed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={config.logoIconUrl}
        alt={alt}
        className={cn('h-9 w-9 object-contain', className)}
      />
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.logoUrl}
        alt={alt}
        className={cn('h-10 max-w-full object-contain dark:hidden', className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={config.logoDarkUrl}
        alt={alt}
        className={cn(
          'hidden h-10 max-w-full object-contain dark:block',
          className,
        )}
      />
    </>
  );
};
