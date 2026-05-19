import express from "express";
import crypto from "crypto";
import { z } from "zod";
import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import WebhookLog from "../models/WebhookLog.js";
import { normalizePayload } from "../utils/normalizeWebhookPayload.js";
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

// ─── Zod schema for the normalized lead object ────────────────────────────────

const normalizedSchema = z.object({
  email:     z.string().email("email is required and must be valid"),
  full_name: z.string().nullable(),
  phone:     z.string().nullable(),
  source:    z.string(),
  metadata:  z.record(z.unknown()),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifies an HMAC-SHA256 signature.
 * header may include a "sha256=" prefix (Meta style) or be a bare hex string.
 */
function verifyHmac(secret, rawBody, header) {
  if (!secret || !rawBody || !header) return false;
  const hex = header.startsWith("sha256=") ? header.slice(7) : header;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // Both buffers must be the same length for timingSafeEqual
  if (hex.length !== digest.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(hex, "hex"), Buffer.from(digest, "hex"));
  } catch {
    return false;
  }
}

async function logWebhook(platform, rawPayload, status, error = null) {
  try {
    await WebhookLog.create({ platform, rawPayload, status, error });
  } catch (e) {
    console.error("[WebhookLog] Failed to write log:", e.message);
  }
}

/**
 * Saves the lead, then fires scoring + email in the background.
 * Never throws — errors are logged and returned for the caller to log.
 */
async function processLead(clientId, normalized) {
  const lead = await Lead.create({
    clientId,
    email:    normalized.email,
    fullName: normalized.full_name,
    phone:    normalized.phone,
    source:   normalized.source,
    metadata: normalized.metadata,
    status:   "new",
  });

  scoreLead(String(lead._id)).catch((e) =>
    console.error("[Webhook] scoreLead error:", e.message)
  );
  sendEmail("on_capture", { email: lead.email, clientId: String(clientId) }).catch((e) =>
    console.error("[Webhook] sendEmail error:", e.message)
  );

  return lead;
}

// ─── Meta – verification handshake (GET) ─────────────────────────────────────

router.get("/meta", (req, res) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } =
    req.query;
  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).json({ message: "Verification failed" });
});

// ─── Meta – lead captured (POST) ─────────────────────────────────────────────

router.post("/meta", async (req, res) => {
  const rawBody  = req.rawBody;
  const signature = req.headers["x-hub-signature-256"];

  if (!verifyHmac(process.env.META_APP_SECRET, rawBody, signature)) {
    await logWebhook("meta", req.body, "failed", "Invalid signature");
    return res.status(401).json({ message: "Invalid signature" });
  }

  // Meta wraps the lead inside entry[0].changes[0].value
  const entry = req.body?.entry?.[0]?.changes?.[0]?.value ?? req.body;

  let normalized;
  try {
    normalized = normalizePayload("meta", entry);
    normalizedSchema.parse(normalized);
  } catch (err) {
    await logWebhook("meta", entry, "failed", err.message);
    return res.status(400).json({ message: "Invalid payload", error: err.message });
  }

  const client = await Client.findOne({ "integrations.meta.pageId": entry.page_id });
  if (!client) {
    await logWebhook("meta", entry, "failed", `No client for pageId=${entry.page_id}`);
    return res.status(404).json({ message: "Client not found" });
  }

  // Respond immediately — Meta retries if it doesn't get 200 quickly
  res.status(200).json({ received: true });

  processLead(client._id, normalized)
    .then(() => logWebhook("meta", entry, "processed"))
    .catch(async (err) => {
      console.error("[Webhook/meta] processLead error:", err.message);
      await logWebhook("meta", entry, "failed", err.message);
    });
});

// ─── Google – Pub/Sub push (POST) ─────────────────────────────────────────────

router.post("/google", async (req, res) => {
  let decoded;
  try {
    const data = req.body?.message?.data;
    if (!data) throw new Error("Missing message.data in Pub/Sub envelope");
    decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch (err) {
    await logWebhook("google", req.body, "failed", err.message);
    return res.status(400).json({ message: "Invalid Pub/Sub payload", error: err.message });
  }

  let normalized;
  try {
    normalized = normalizePayload("google", decoded);
    normalizedSchema.parse(normalized);
  } catch (err) {
    await logWebhook("google", decoded, "failed", err.message);
    return res.status(400).json({ message: "Invalid payload", error: err.message });
  }

  const client = await Client.findOne({ "integrations.google.customerId": decoded.google_key });
  if (!client) {
    await logWebhook("google", decoded, "failed", `No client for customerId=${decoded.google_key}`);
    return res.status(404).json({ message: "Client not found" });
  }

  res.status(200).json({ received: true });

  processLead(client._id, normalized)
    .then(() => logWebhook("google", decoded, "processed"))
    .catch(async (err) => {
      console.error("[Webhook/google] processLead error:", err.message);
      await logWebhook("google", decoded, "failed", err.message);
    });
});

// ─── LinkedIn – form response (POST) ─────────────────────────────────────────

router.post("/linkedin", async (req, res) => {
  const leadForm = req.body?.leadFormResponse;
  if (!leadForm) {
    await logWebhook("linkedin", req.body, "failed", "Missing leadFormResponse");
    return res.status(400).json({ message: "Invalid payload" });
  }

  // owner = "urn:li:organization:<id>"
  const orgId = leadForm.owner?.split(":").pop();
  const client = await Client.findOne({ "integrations.linkedin.organizationId": orgId });
  if (!client) {
    await logWebhook("linkedin", req.body, "failed", `No client for organizationId=${orgId}`);
    return res.status(404).json({ message: "Client not found" });
  }

  // Require that an access token has been configured for this platform
  const rawClient = await Client.findById(client._id).select("integrations.linkedin.accessToken").lean();
  if (!rawClient?.integrations?.linkedin?.accessToken) {
    await logWebhook("linkedin", req.body, "failed", "No access token configured");
    return res.status(401).json({ message: "Unauthorized" });
  }

  let normalized;
  try {
    normalized = normalizePayload("linkedin", req.body);
    normalizedSchema.parse(normalized);
  } catch (err) {
    await logWebhook("linkedin", req.body, "failed", err.message);
    return res.status(400).json({ message: "Invalid payload", error: err.message });
  }

  res.status(200).json({ received: true });

  processLead(client._id, normalized)
    .then(() => logWebhook("linkedin", req.body, "processed"))
    .catch(async (err) => {
      console.error("[Webhook/linkedin] processLead error:", err.message);
      await logWebhook("linkedin", req.body, "failed", err.message);
    });
});

// ─── TikTok – lead form submission (POST) ────────────────────────────────────

router.post("/tiktok", async (req, res) => {
  const rawBody   = req.rawBody;
  const signature = req.headers["x-tiktok-signature"];

  if (!verifyHmac(process.env.TIKTOK_APP_SECRET, rawBody, signature)) {
    await logWebhook("tiktok", req.body, "failed", "Invalid signature");
    return res.status(401).json({ message: "Invalid signature" });
  }

  // Ack events we don't handle (pings, other event types)
  if (req.body?.event !== "LEAD_FORM_SUBMISSION") {
    return res.status(200).json({ received: true });
  }

  let normalized;
  try {
    normalized = normalizePayload("tiktok", req.body);
    normalizedSchema.parse(normalized);
  } catch (err) {
    await logWebhook("tiktok", req.body, "failed", err.message);
    return res.status(400).json({ message: "Invalid payload", error: err.message });
  }

  const client = await Client.findOne({
    "integrations.tiktok.advertiserId": req.body.advertiser_id,
  });
  if (!client) {
    await logWebhook("tiktok", req.body, "failed", `No client for advertiserId=${req.body.advertiser_id}`);
    return res.status(404).json({ message: "Client not found" });
  }

  res.status(200).json({ received: true });

  processLead(client._id, normalized)
    .then(() => logWebhook("tiktok", req.body, "processed"))
    .catch(async (err) => {
      console.error("[Webhook/tiktok] processLead error:", err.message);
      await logWebhook("tiktok", req.body, "failed", err.message);
    });
});

export default router;
