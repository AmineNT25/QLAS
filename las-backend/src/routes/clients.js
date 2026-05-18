import { Router } from "express";
import Client from "../models/Client.js";
import Lead from "../models/Lead.js";
import Form from "../models/Form.js";
import ScoringRule from "../models/ScoringRule.js";
import EmailTemplate from "../models/EmailTemplate.js";
import LeadActivity from "../models/LeadActivity.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
} from "../validators/schemas.js";

const router = Router();

// Every client query is scoped to the authenticated owner. A "client" *is*
// the tenant here, so the only safe filter is `createdBy === req.user.sub`.
router.use(requireAuth);

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

    const filter = { createdBy: req.user.sub };
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
      const client = await Client.findOne({
        _id: req.params.id,
        createdBy: req.user.sub,
      }).lean();
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
    const client = await new Client({
      ...req.body,
      createdBy: req.user.sub,
    }).save();
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
      const client = await Client.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user.sub },
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
// unreachable (no client = never in scope), so dependent records go too.
router.delete(
  "/:id",
  validate(clientIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const client = await Client.findOne({
        _id: req.params.id,
        createdBy: req.user.sub,
      }).select("_id");
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

export default router;
