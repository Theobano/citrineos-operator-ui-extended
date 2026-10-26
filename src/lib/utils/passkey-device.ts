// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

export type PasskeyDeviceState = 'registered' | 'declined';

const key = (userId: string) => `passkey:device:${userId}`;
const laterKey = (userId: string) => `passkey:later:${userId}`;

export const isPasskeySupported = () =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential;

export const getPasskeyDeviceState = (
  userId: string,
): PasskeyDeviceState | null =>
  localStorage.getItem(key(userId)) as PasskeyDeviceState | null;

export const setPasskeyDeviceState = (
  userId: string,
  state: PasskeyDeviceState,
) => localStorage.setItem(key(userId), state);

export const isPasskeyPromptSnoozed = (userId: string) =>
  sessionStorage.getItem(laterKey(userId)) === 'true';

export const snoozePasskeyPrompt = (userId: string) =>
  sessionStorage.setItem(laterKey(userId), 'true');

export const describeDevice = (): string => {
  const ua = navigator.userAgent;
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone|iPad/i.test(ua)
      ? 'iOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mac/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${os} ${browser}`;
};
