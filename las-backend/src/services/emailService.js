import { Resend } from "resend";
import { z } from "zod";
import EmailTemplate from "../models/EmailTemplate.js";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmailSchema = z.object({
  trigger: z.string().min(1, "trigger is required"),
  leadEmail: z.string().email("Invalid lead email"),
  clientId: z.string().min(1, "clientId is required"),
});

/**
 * Reads agency branding from environment variables. These are agency-wide
 * (set on Vercel/Railway) — never per-client and never stored in MongoDB.
 */
function agencyEnv() {
  return {
    name:         process.env.AGENCY_NAME          ?? "Our Team",
    logoUrl:      process.env.AGENCY_LOGO_URL      ?? "",
    website:      process.env.AGENCY_WEBSITE       ?? "",
    supportEmail: process.env.AGENCY_SUPPORT_EMAIL ?? "",
  };
}

/** Replace {{agency_*}} placeholders in template strings with env values. */
function fillAgencyPlaceholders(text) {
  if (!text) return text;
  const a = agencyEnv();
  return text
    .replaceAll("{{agency_name}}",          a.name)
    .replaceAll("{{agency_logo}}",          a.logoUrl)
    .replaceAll("{{agency_website}}",       a.website)
    .replaceAll("{{agency_support_email}}", a.supportEmail);
}

/** Default branded HTML body used when no template body is configured. */
function defaultBody() {
  const a = agencyEnv();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      ${a.logoUrl ? `<img src="${a.logoUrl}" alt="${a.name}" style="max-width: 200px; margin-bottom: 24px;" />` : ""}
      <p>Hi there,</p>
      <p>Thank you for your interest! We've received your details and will be in touch shortly.</p>
      <p>Best regards,<br/>The ${a.name} Team</p>
      ${a.supportEmail ? `<p style="font-size:12px;color:#888;margin-top:24px;">Questions? Reach us at <a href="mailto:${a.supportEmail}">${a.supportEmail}</a></p>` : ""}
      ${a.website     ? `<p style="font-size:12px;color:#888;"><a href="${a.website}">${a.website}</a></p>` : ""}
    </div>
  `;
}

/**
 * Looks up the EmailTemplate for the given trigger + client, then sends
 * the email via Resend. Silently skips if no template is configured.
 * Logs but never throws on send failure so it never breaks lead capture.
 *
 * Agency name/logo/website/support email are injected from env at send time
 * via {{agency_name}}, {{agency_logo}}, {{agency_website}}, {{agency_support_email}}.
 */
export async function sendEmail(trigger, { email: leadEmail, clientId }) {
  const { trigger: t, leadEmail: to, clientId: cid } = sendEmailSchema.parse({
    trigger,
    leadEmail,
    clientId: String(clientId),
  });

  const template = await EmailTemplate.findOne({ clientId: cid, trigger: t });
  if (!template) return;

  const a       = agencyEnv();
  const subject = fillAgencyPlaceholders(template.subject);
  const html    = fillAgencyPlaceholders(template.body) || defaultBody();
  const from    = process.env.RESEND_FROM_EMAIL || `${a.name} <onboarding@resend.dev>`;

  try {
    await resend.emails.send({ from, to: [to], subject, html });
  } catch (err) {
    console.error(
      `[EmailService] Failed to send trigger="${t}" to="${to}": ${err.message}`
    );
  }
}
