import { Router } from "express";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import {
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
} from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
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
    res.status(201).json({ data: lead, message: "Lead created successfully" });
  } catch (err) {
    next(err);
  }
});

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
