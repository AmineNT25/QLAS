import express from "express";
import { z } from "zod";
import Client from "../models/Client.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();
router.use(requireAuth);

const objectIdRx = /^[a-f\d]{24}$/i;

const createClientSchema = z.object({
  name:     z.string().min(1),
  industry: z.string().optional(),
  website:  z.string().url().optional().or(z.literal("")),
});

const patchIntegrationsSchema = z.object({
  meta: z
    .object({
      accessToken: z.string().optional(),
      pageId:      z.string().optional(),
      formId:      z.string().optional(),
    })
    .optional(),
  google: z
    .object({
      accessToken: z.string().optional(),
      customerId:  z.string().optional(),
    })
    .optional(),
  linkedin: z
    .object({
      accessToken:    z.string().optional(),
      organizationId: z.string().optional(),
    })
    .optional(),
  tiktok: z
    .object({
      accessToken:  z.string().optional(),
      advertiserId: z.string().optional(),
    })
    .optional(),
});

// ─── List ─────────────────────────────────────────────────────────────────────

router.get("/", async (req, res, next) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json({ data: clients });
  } catch (err) {
    next(err);
  }
});

// ─── Create ───────────────────────────────────────────────────────────────────

router.post("/", validate(createClientSchema), async (req, res, next) => {
  try {
    const client = await Client.create({ ...req.body, createdBy: req.user.sub });
    res.status(201).json({ data: client });
  } catch (err) {
    next(err);
  }
});

// ─── Get one ──────────────────────────────────────────────────────────────────

router.get("/:id", async (req, res, next) => {
  try {
    if (!objectIdRx.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid client id" });
    }
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

// ─── Update basic info ────────────────────────────────────────────────────────

router.patch("/:id", async (req, res, next) => {
  try {
    if (!objectIdRx.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid client id" });
    }
    const allowed = ["name", "industry", "website"];
    const update  = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    const client = await Client.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ data: client });
  } catch (err) {
    next(err);
  }
});

// ─── Update integrations ──────────────────────────────────────────────────────

router.patch("/:id/integrations", validate(patchIntegrationsSchema), async (req, res, next) => {
  try {
    if (!objectIdRx.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid client id" });
    }

    // Build a $set update only for the platforms included in the request body
    // so we never accidentally wipe platforms not being updated.
    const setOps = {};
    for (const [platform, creds] of Object.entries(req.body)) {
      for (const [field, value] of Object.entries(creds)) {
        if (value !== undefined) {
          setOps[`integrations.${platform}.${field}`] = value;
        }
      }
    }

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $set: setOps },
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ message: "Client not found" });

    // toJSON transform strips accessTokens before the response is sent
    res.json({ data: client, message: "Integrations updated" });
  } catch (err) {
    next(err);
  }
});

// ─── Delete ───────────────────────────────────────────────────────────────────

router.delete("/:id", async (req, res, next) => {
  try {
    if (!objectIdRx.test(req.params.id)) {
      return res.status(400).json({ message: "Invalid client id" });
    }
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json({ message: "Client deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
