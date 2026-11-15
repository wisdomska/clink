/**
 * Auth email templates for Supabase. Links use the token hash, which the
 * /auth/callback route verifies on the server, so a link works on any device
 * (not only in the browser that asked for it). Dark, on-brand, plain HTML.
 */
const shell = (title: string, body: string, cta: string, url: string) => `<!doctype html>
<html lang="en-GB"><body style="margin:0;background:#0F0E11;font-family:Helvetica,Arial,sans-serif;color:#F4F0F5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0E11;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px">
<tr><td style="font-size:28px;font-weight:800;letter-spacing:-0.02em;padding-bottom:24px">clink</td></tr>
<tr><td style="font-size:24px;font-weight:800;line-height:1.2;padding-bottom:12px">${title}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;color:#ADA6B2;padding-bottom:24px">${body}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${url}" style="display:inline-block;background:#E68AF5;color:#0F0E11;font-weight:700;font-size:16px;text-decoration:none;padding:14px 28px;border-radius:999px">${cta}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#8B8590">This link works once and expires in an hour. If you didn't ask for it, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;

const link = (type: string) =>
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=${type}`;

export const EMAIL_TEMPLATES = {
  mailer_subjects_magic_link: "Your Clink sign-in link",
  mailer_templates_magic_link_content: shell(
    "Sign in to Clink",
    "Tap below to sign in. Your person is waiting.",
    "Sign in",
    link("magiclink"),
  ),
  mailer_subjects_confirmation: "Confirm your email for Clink",
  mailer_templates_confirmation_content: shell(
    "Confirm your email",
    "One tap and you're in. Then link up with your person.",
    "Confirm and continue",
    link("signup"),
  ),
  mailer_subjects_recovery: "Get back into Clink",
  mailer_templates_recovery_content: shell(
    "Get back in",
    "Tap below to sign in again.",
    "Sign in",
    link("recovery"),
  ),
  mailer_subjects_email_change: "Confirm your new email for Clink",
  mailer_templates_email_change_content: shell(
    "Confirm your new email",
    "Tap below to use this address for Clink.",
    "Confirm",
    link("email_change"),
  ),
  mailer_subjects_invite: "You're invited to Clink",
  mailer_templates_invite_content: shell(
    "You're invited",
    "Someone wants to do things together, from apart.",
    "Accept",
    link("invite"),
  ),
};
