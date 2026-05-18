import { Router } from "express";
import Lead from "../models/Lead.js";
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
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// ─── GET /api/leads ───────────────────────────────────────────────────────────
router.get("/", validate(leadQuerySchema, "query"), async (req, res, next) => {
  try {
    const { page, limit, status, clientId, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (clientId) filter.clientId = clientId;
    if (search) filter.email = { $regex: search, $options: "i" };

    const [data, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const activities = await LeadActivity.find({ leadId: lead._id }).sort({ createdAt: -1 });

    res.json({ data: { ...lead.toObject(), leadActivities: activities } });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/leads ──────────────────────────────────────────────────────────
router.post("/", validate(createLeadSchema), async (req, res, next) => {
  try {
    const lead = await new Lead({ ...req.body, status: "new", score: 0 }).save();

    // Non-blocking: score then send welcome email
    scoreLead(String(lead._id))
      .then(() =>
        sendEmail("on_capture", {
          email: lead.email,
          clientId: String(lead.clientId),
        })
      )
      .catch((err) =>
        console.error(`[Leads] Post-save pipeline failed for ${lead._id}: ${err.message}`)
      );

    res.status(201).json({ data: lead, message: "Lead created successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/leads/:id/score ────────────────────────────────────────────────
router.post(
  "/:id/score",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const score = await scoreLead(req.params.id);
      res.json({ data: { score }, message: "Lead scored successfully" });
    } catch (err) {
      if (err.message.includes("not found")) {
        return res.status(404).json({ message: err.message });
      }
      next(err);
    }
  }
);

// ─── PATCH /api/leads/:id ─────────────────────────────────────────────────────
router.patch("/:id", validate(updateLeadSchema), async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ data: lead, message: "Lead updated successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/leads/:id/activities ────────────────────────────────────────────
router.get(
  "/:id/activities",
  validate(leadIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const activities = await LeadActivity.find({ leadId: req.params.id })
        .sort({ createdAt: -1 });
      res.json({ data: activities });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/leads/:id/activities ───────────────────────────────────────────
router.post(
  "/:id/activities",
  requireAuth,
  validate(leadIdParamSchema, "params"),
  validate(createActivitySchema),
  async (req, res, next) => {
    try {
      const lead = await Lead.findById(req.params.id).select("_id");
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
router.delete("/:id", async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
