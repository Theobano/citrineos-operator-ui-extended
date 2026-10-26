// SPDX-FileCopyrightText: 2026 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0
import nodemailer, { type Transporter } from 'nodemailer';

type Mail = { to: string; subject: string; text: string; html?: string };

const globalForMail = globalThis as unknown as {
  __mailTransport?: Transporter;
};

export const isMailConfigured = () => !!process.env.SMTP_HOST;

const getTransport = (): Transporter => {
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  return (globalForMail.__mailTransport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
  }));
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Sends an email through the configured SMTP server (SMTP_* env variables).
 * Without SMTP_HOST the message is only logged so local setups keep working.
 */
export async function sendMail({ to, subject, text, html }: Mail) {
  if (!isMailConfigured()) {
    console.info(`[mail] SMTP not configured. To: ${to} | ${subject}\n${text}`);
    return;
  }
  await getTransport().sendMail({
    from:
      process.env.SMTP_FROM ||
      `${process.env.NEXT_PUBLIC_APP_NAME || 'CitrineOS'} <no-reply@localhost>`,
    to,
    subject,
    text,
    html,
  });
}

export const actionEmail = (
  appName: string,
  intro: string,
  actionLabel: string,
  url: string,
) => ({
  text: `${intro}\n\n${actionLabel}: ${url}\n`,
  html: `<p>${escapeHtml(intro)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(actionLabel)}</a></p><p style="color:#888">${escapeHtml(appName)}</p>`,
});
