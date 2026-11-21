import "server-only";
import nodemailer from "nodemailer";
import { serverEnv } from "@/lib/env";

/**
 * Email from Clink (only the weekly admin summary for now), through Brevo's
 * SMTP relay. Not set up (no sender): nothing is sent, and the caller is told.
 */
export async function sendMail(m: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** One-click unsubscribe (RFC 8058): mail apps show it as their Unsubscribe button. */
  unsubscribe?: string;
}) {
  const env = serverEnv();
  const local = env.SMTP_HOST === "127.0.0.1" || env.SMTP_HOST === "localhost";
  if (!local && (!env.BREVO_SMTP_LOGIN || !env.BREVO_SMTP_KEY || !env.BREVO_SENDER))
    return { sent: false as const, reason: "not_configured" };
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    requireTLS: !local,
    auth: local ? undefined : { user: env.BREVO_SMTP_LOGIN!, pass: env.BREVO_SMTP_KEY! },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({
    from: { name: "Clink", address: env.BREVO_SENDER ?? "clink@localhost" },
    to: m.to,
    subject: m.subject,
    text: m.text,
    html: m.html,
    ...(m.unsubscribe
      ? {
          list: { unsubscribe: { url: m.unsubscribe, comment: "Stop the weekly email" } },
          headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        }
      : {}),
  });
  return { sent: true as const };
}
