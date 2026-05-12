import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { formSubmitSchema } from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// ─── GET /api/forms/:id ───────────────────────────────────────────────────────
// Public endpoint — fetches form config (fields) for rendering
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("forms")
      .select("id, name, fields, client_id")
      .eq("id", req.params.id)
      .eq("is_active", true)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Form not found or inactive" });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/forms/:id/submit ───────────────────────────────────────────────
// Public-facing endpoint — no auth required
// Creates a lead record tied to this form and its client
router.post("/:id/submit", validate(formSubmitSchema), async (req, res, next) => {
  try {
    // 1. Verify form exists and is active
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, client_id, is_active")
      .eq("id", req.params.id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ message: "Form not found" });
    }
    if (!form.is_active) {
      return res.status(403).json({ message: "This form is no longer accepting submissions" });
    }

    // 2. Create the lead
    const { email, full_name, phone, utm_source, utm_medium, utm_campaign, metadata } = req.body;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: form.client_id,
        form_id: form.id,
        email,
        full_name,
        phone,
        utm_source,
        utm_medium,
        utm_campaign,
        metadata,
        status: "new",
        score: 0,
      })
      .select()
      .single();

    if (leadError) throw leadError;

    // 3. Log the submission activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      type: "form_submission",
      description: `Lead submitted via form: ${req.params.id}`,
    });

    res.status(201).json({
      message: "Thank you! Your submission has been received.",
      lead_id: lead.id,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
