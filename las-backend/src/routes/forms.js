import { Router } from "express";
import Form from "../models/Form.js";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import { formSubmitSchema } from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// Normalize a Mongoose form doc to the shape the frontend expects.
function toClientShape(form, submissionsCount = 0) {
  const f = form.toObject ? form.toObject() : form;
  return {
    id:               String(f._id),
    name:             f.name,
    description:      f.description ?? null,
    client_id:        f.clientId ? String(f.clientId) : null,
    is_active:        f.isActive,
    fields:           f.fields ?? [],
    submissions_count: submissionsCount,
    created_at:       f.createdAt,
  };
}

// ─── GET /api/forms — authenticated list with submission counts ───────────────
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 });

    // Count submissions per form in one query
    const formIds = forms.map((f) => f._id);
    const counts  = await Lead.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: "$formId", count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map(({ _id, count }) => [String(_id), count]));

    res.json({ data: forms.map((f) => toClientShape(f, countMap[String(f._id)] ?? 0)) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/forms/:id/submissions — authenticated ──────────────────────────
router.get("/:id/submissions", requireAuth, async (req, res, next) => {
  try {
    const leads = await Lead.find({ formId: req.params.id })
      .sort({ createdAt: -1 })
      .select("email fullName phone status score createdAt")
      .lean();

    const data = leads.map((l) => ({
      email:      l.email,
      name:       l.fullName ?? "",
      phone:      l.phone ?? "",
      status:     l.status,
      score:      String(l.score),
      created_at: new Date(l.createdAt).toLocaleDateString(),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/forms/:id — toggle active, authenticated ─────────────────────
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const update = {};
    if (req.body.is_active !== undefined) update.isActive = req.body.is_active;
    if (req.body.name      !== undefined) update.name     = req.body.name;

    const form = await Form.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!form) return res.status(404).json({ message: "Form not found" });

    res.json({ data: toClientShape(form) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/forms/:id ───────────────────────────────────────────────────────
// Public endpoint — fetches form config for rendering
router.get("/:id", async (req, res, next) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, isActive: true });
    if (!form) return res.status(404).json({ message: "Form not found or inactive" });
    res.json({ data: form });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/forms/:id/submit ───────────────────────────────────────────────
// Public — no auth required
router.post("/:id/submit", validate(formSubmitSchema), async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    if (!form.isActive) {
      return res.status(403).json({ message: "This form is no longer accepting submissions" });
    }

    const { email, fullName, phone, utmSource, utmMedium, utmCampaign, metadata } = req.body;

    const lead = await new Lead({
      clientId: form.clientId,
      formId: form._id,
      email,
      fullName,
      phone,
      utmSource,
      utmMedium,
      utmCampaign,
      metadata,
      status: "new",
      score: 0,
    }).save();

    await new LeadActivity({
      leadId: lead._id,
      type: "form_submission",
      description: `Lead submitted via form: ${req.params.id}`,
    }).save();

    // Non-blocking: score then send welcome email
    scoreLead(String(lead._id))
      .then(() =>
        sendEmail("on_capture", {
          email: lead.email,
          clientId: String(lead.clientId),
        })
      )
      .catch((err) =>
        console.error(`[Forms] Post-save pipeline failed for ${lead._id}: ${err.message}`)
      );

    res.status(201).json({
      message: "Thank you! Your submission has been received.",
      lead_id: lead._id,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
