import { Router } from "express";
import Form from "../models/Form.js";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import {
  formSubmitSchema,
  createFormSchema,
  updateFormSchema,
  formIdParamSchema,
} from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { requireClientScope } from "../middleware/requireClientScope.js";
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

// ─── GET /api/forms ───────────────────────────────────────────────────────────
// Dashboard list — scoped to the active client.
router.get("/", requireAuth, requireClientScope, async (req, res, next) => {
  try {
    const forms = await Form.find(req.scoped()).sort({ createdAt: -1 }).lean();
    const formIds = forms.map((f) => f._id);
    const counts = await Lead.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: "$formId", n: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

    res.json({
      data: forms.map((f) => ({
        ...f,
        submissions_count: countMap[String(f._id)] ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/forms ──────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireClientScope,
  validate(createFormSchema),
  async (req, res, next) => {
    try {
      const form = await new Form({
        ...req.body,
        clientId: req.clientId,
      }).save();
      res.status(201).json({ data: form, message: "Form created" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/forms/:id/submissions ───────────────────────────────────────────
// Scoped: the form must belong to the active client.
router.get(
  "/:id/submissions",
  requireAuth,
  requireClientScope,
  validate(formIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const form = await Form.findOne(
        req.scoped({ _id: req.params.id })
      ).select("_id");
      if (!form) return res.status(404).json({ message: "Form not found" });

      const leads = await Lead.find(req.scoped({ formId: form._id }))
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        data: leads.map((l) => ({
          email: l.email,
          full_name: l.fullName ?? "",
          phone: l.phone ?? "",
          status: l.status,
          score: l.score,
          submitted_at: l.createdAt,
          ...(l.metadata || {}),
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/forms/:id ─────────────────────────────────────────────────────
router.patch(
  "/:id",
  requireAuth,
  requireClientScope,
  validate(formIdParamSchema, "params"),
  validate(updateFormSchema),
  async (req, res, next) => {
    try {
      const form = await Form.findOneAndUpdate(
        req.scoped({ _id: req.params.id }),
        req.body,
        { new: true, runValidators: true }
      );
      if (!form) return res.status(404).json({ message: "Form not found" });
      res.json({ data: form, message: "Form updated" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/forms/:id ───────────────────────────────────────────────────────
// Public — fetches active form config for rendering (used by the embed).
router.get(
  "/:id",
  validate(formIdParamSchema, "params"),
  async (req, res, next) => {
    try {
      const form = await Form.findOne({ _id: req.params.id, isActive: true });
      if (!form)
        return res.status(404).json({ message: "Form not found or inactive" });
      res.json({ data: form });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/forms/:id/submit ───────────────────────────────────────────────
// Public — no auth. Tenant is derived from the form, never the caller.
router.post(
  "/:id/submit",
  validate(formIdParamSchema, "params"),
  validate(formSubmitSchema),
  async (req, res, next) => {
    try {
      const form = await Form.findById(req.params.id);
      if (!form) return res.status(404).json({ message: "Form not found" });
      if (!form.isActive) {
        return res
          .status(403)
          .json({ message: "This form is no longer accepting submissions" });
      }

      const { email, fullName, phone, utmSource, utmMedium, utmCampaign, metadata } =
        req.body;

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

      scoreLead(String(lead._id))
        .then(() =>
          sendEmail("on_capture", {
            email: lead.email,
            clientId: String(lead.clientId),
          })
        )
        .catch((err) =>
          console.error(
            `[Forms] Post-save pipeline failed for ${lead._id}: ${err.message}`
          )
        );

      res.status(201).json({
        message: "Thank you! Your submission has been received.",
        lead_id: lead._id,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
