/**
 * E-Mail service using Nodemailer over SMTP.
 * All credentials loaded strictly from process.env.
 */
import nodemailer from 'nodemailer';
import {
  buildEsimPurchasedHtml,
  buildEsimPurchasedText,
  type EsimPurchasedData,
} from './templates/esim-purchased';
import {
  buildTopUpHtml,
  buildTopUpText,
  type TopUpConfirmedData,
} from './templates/topup-confirmed';

function createTransporter() {
  const host   = process.env.SMTP_HOST;
  const port   = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
}

function fromAddress(): string {
  const name    = process.env.SMTP_FROM_NAME    ?? 'eSIM Shop';
  const address = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER ?? '';
  return `"${name}" <${address}>`;
}

// ─── Send eSIM purchase confirmation ─────────────────────────

export async function sendEsimEmail(data: EsimPurchasedData): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `📱 Deine eSIM für ${data.countryName} ist bereit`,
    html:    buildEsimPurchasedHtml(data),
    text:    buildEsimPurchasedText(data),
  });

  console.log(`[mailer] eSIM confirmation sent to ${data.to}`);
}

// ─── Send Top-Up confirmation ─────────────────────────────────

export async function sendTopUpEmail(data: TopUpConfirmedData & { to: string }): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `✅ Top-Up erfolgreich – ${data.dataGb} GB aufgeladen`,
    html:    buildTopUpHtml(data),
    text:    buildTopUpText(data),
  });

  console.log(`[mailer] Top-up confirmation sent to ${data.to}`);
}
