import { Router } from "express";
import Lead from "../models/Lead.js";
import Form from "../models/Form.js";
import Client from "../models/Client.js";
import LeadActivity from "../models/LeadActivity.js";
import {
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
  leadIdParamSchema,
  createActivitySchema,
} from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireClientScope } from "../middleware/requireClientScope.js";
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// ─── POST /api/leads ──────────────────────────────────────────────────────────
// PUBLIC — this is the ingestion endpoint the embed snippet posts to.
// Tenant is *derived*, never trusted from the caller:
//   • formId present  → clientId comes from the form (client-supplied ignored)
//   • clientId only    → must reference a real Client
router.post("/", validate(createLeadSchema), async (req, res, next) => {
  try {
    const { formId, clientId: bodyClientId, ...rest } = req.body;

    let clientId = bodyClientId;
    let form = null;

    if (formId) {
      form = await Form.findById(formId).select("_id clientId isActive");
      if (!form) return res.status(404).json({ message: "Form not found" });
      if (!form.isActive) {
        return res
          .status(403)
          .json({ message: "This form is no longer accepting submissions" });
      }
      clientId = String(form.clientId);
    } else {
      const client = await Client.findById(clientId).select("_id");
      if (!client) return res.status(404).json({ message: "Client not found" });
    }

    const lead = await new Lead({
      ...rest,
      clientId,
      formId: form?._id,
      status: "new",
      score: 0,
    }).save();

    if (form) {
      await new LeadActivity({
        leadId: lead._id,
        type: "form_submission",
        description: `Lead submitted via form: ${form._id}`,
      }).save();
    }

    // Non-blocking: score then send welcome email
    scoreLead(String(lead._id))
      .then(() =>
        sendEmail("on_capture", {
          email: lead.email,
          clientId: String(lead.clientId),
        })
      )
      .catch((err) =>
        console.error(
          `[Leads] Post-save pipeline failed for ${lead._id}: ${err.message}`
        )
      );

    res.status(201).json({ data: lead, message: "Lead created successfully" });
  } catch (err) {
    next(err);
  }
});

// Everything below is dashboard-facing and tenant-isolated.
router.use(requireAuth, requireClientScope);

// ─── GET /api/leads ───────────────────────────────────────────────────────────
router.get("/", validate(leadQuerySchema, "query"), async (req, res, next) => {
  try {
    const { page, limit, status, search } = req.query;
    const skip = (page - 1) * limit;

    // clientId is forced from the active scope — a client-supplied one is
    // intentionally ignored so a tenant cannot read another tenant's leads.
    const filter = req.scoped();
    if (status) filter.status = status;
    if (search) filter.email = { $regex: search, $options: "i" };

    const [data, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────
router.get(
  "/:id",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOne(req.scoped({ _id: req.params.id }));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const activities = await LeadActivity.find({ leadId: lead._id }).sort({
        createdAt: -1,
      });

      res.json({ data: { ...lead.toObject(), leadActivities: activities } });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/leads/:id/score ────────────────────────────────────────────────
router.post(
  "/:id/score",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOne(req.scoped({ _id: req.params.id })).select(
        "_id"
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const score = await scoreLead(req.params.id);
      res.json({ data: { score }, message: "Lead scored successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/leads/:id ─────────────────────────────────────────────────────
router.patch(
  "/:id",
  validate(leadIdParamSchema, "params"),
  validate(updateLeadSchema),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOneAndUpdate(
        req.scoped({ _id: req.params.id }),
        req.body,
        { new: true }
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json({ data: lead, message: "Lead updated successfully" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/leads/:id/activities ────────────────────────────────────────────
router.get(
  "/:id/activities",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOne(req.scoped({ _id: req.params.id })).select(
        "_id"
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const activities = await LeadActivity.find({ leadId: lead._id }).sort({
        createdAt: -1,
      });
      res.json({ data: activities });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/leads/:id/activities ───────────────────────────────────────────
router.post(
  "/:id/activities",
  validate(leadIdParamSchema, "params"),
  validate(createActivitySchema),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOne(req.scoped({ _id: req.params.id })).select(
        "_id"
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const activity = await new LeadActivity({
        leadId: lead._id,
        userId: req.user?.sub ?? null,
        type: req.body.type,
        description: req.body.description,
      }).save();

      res.status(201).json({ data: activity, message: "Activity logged" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/leads/:id ────────────────────────────────────────────────────
router.delete(
  "/:id",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const lead = await Lead.findOneAndDelete(
        req.scoped({ _id: req.params.id })
      );
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      await LeadActivity.deleteMany({ leadId: lead._id });
      res.json({ message: "Lead deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
