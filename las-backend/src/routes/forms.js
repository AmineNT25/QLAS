import { Router } from "express";
import Form from "../models/Form.js";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import { formSubmitSchema } from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
import { scoreLead } from "../services/scoringService.js";
import { sendEmail } from "../services/emailService.js";

const router = Router();

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
