import { Router } from "express";
import { z } from "zod";
import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import Form from "../models/Form.js";
import ScoringRule from "../models/ScoringRule.js";
import EmailTemplate from "../models/EmailTemplate.js";
import LeadActivity from "../models/LeadActivity.js";
import { validate } from "../middleware/validate.js";
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
} from "../validators/schemas.js";

// Ad-platform integration credentials (Meta / Google / LinkedIn / TikTok).
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

const router = Router();

/**
 * Returns relation counts (leads / forms / scoringRules / emailTemplates)
 * for a set of client ids in four grouped queries.
 */
async function relationCounts(clientIds) {
  if (clientIds.length === 0) return {};

  const group = [
    { $match: { clientId: { $in: clientIds } } },
    { $group: { _id: "$clientId", n: { $sum: 1 } } },
  ];

  const [leads, forms, rules, templates] = await Promise.all([
    Lead.aggregate(group),
    Form.aggregate(group),
    ScoringRule.aggregate(group),
    EmailTemplate.aggregate(group),
  ]);

  const acc = {};
  const put = (rows, key) =>
    rows.forEach((r) => {
      const id = String(r._id);
      acc[id] = acc[id] || { leads: 0, forms: 0, scoringRules: 0, emailTemplates: 0 };
      acc[id][key] = r.n;
    });

  put(leads, "leads");
  put(forms, "forms");
  put(rules, "scoringRules");
  put(templates, "emailTemplates");
  return acc;
}

// ─── GET /api/clients ─────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit ?? "20", 10) || 20);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      filter.name = { $regex: String(req.query.search), $options: "i" };
    }

    const [data, total] = await Promise.all([
      Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Client.countDocuments(filter),
    ]);

    const counts = await relationCounts(data.map((c) => c._id));

    res.json({
      data: data.map((c) => ({
        ...c,
        counts: counts[String(c._id)] ?? {
          leads: 0,
          forms: 0,
          scoringRules: 0,
          emailTemplates: 0,
        },
      })),
      total,
      meta: { page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
router.get(
  "/:id",
  validate(clientIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const client = await Client.findById(req.params.id).lean();
      if (!client) return res.status(404).json({ message: "Client not found" });

      const counts = await relationCounts([client._id]);
      res.json({ data: { ...client, counts: counts[String(client._id)] } });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/clients ────────────────────────────────────────────────────────
router.post("/", validate(createClientSchema), async (req, res, next) => {
  try {
    const client = await new Client({ ...req.body }).save();
    res.status(201).json({ data: client, message: "Client created" });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
router.put(
  "/:id",
  validate(clientIdParamSchema, "params"),
  validate(updateClientSchema),
  async (req, res, next) => {
    try {
      const client = await Client.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!client) return res.status(404).json({ message: "Client not found" });
      res.json({ data: client, message: "Client updated" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/clients/:id ──────────────────────────────────────────────────
// Cascades: leads under a deleted client would otherwise be permanently
// unreachable, so dependent records go too.
router.delete(
  "/:id",
  validate(clientIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const client = await Client.findById(req.params.id).select("_id");
      if (!client) return res.status(404).json({ message: "Client not found" });

      const leads = await Lead.find({ clientId: client._id }).select("_id").lean();
      const leadIds = leads.map((l) => l._id);

      await Promise.all([
        LeadActivity.deleteMany({ leadId: { $in: leadIds } }),
        Lead.deleteMany({ clientId: client._id }),
        Form.deleteMany({ clientId: client._id }),
        ScoringRule.deleteMany({ clientId: client._id }),
        EmailTemplate.deleteMany({ clientId: client._id }),
      ]);
      await Client.deleteOne({ _id: client._id });

      res.json({ message: "Client and related records deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/clients/:id/integrations ──────────────────────────────────────
router.patch(
  "/:id/integrations",
  validate(clientIdParamSchema, "params"),
  validate(patchIntegrationsSchema),
  async (req, res, next) => {
    try {
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

      res.json({ data: client, message: "Integrations updated" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
