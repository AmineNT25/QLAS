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
 * Looks up the EmailTemplate for the given trigger + client, then sends
 * the email via Resend. Silently skips if no template is configured.
 * Logs but never throws on send failure so it never breaks lead capture.
 */
export async function sendEmail(trigger, { email: leadEmail, clientId }) {
  const { trigger: t, leadEmail: to, clientId: cid } = sendEmailSchema.parse({
    trigger,
    leadEmail,
    clientId: String(clientId),
  });

  const template = await EmailTemplate.findOne({ clientId: cid, trigger: t });
  if (!template) return;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LAS <onboarding@resend.dev>",
      to: [to],
      subject: template.subject,
      html: template.body || "<p>Thank you for your submission!</p>",
    });
  } catch (err) {
    console.error(
      `[EmailService] Failed to send trigger="${t}" to="${to}": ${err.message}`
    );
  }
}
