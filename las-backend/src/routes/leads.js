import { Router } from "express";
import { supabase } from "../config/supabase.js";
import {
  createLeadSchema,
  updateLeadSchema,
  leadQuerySchema,
} from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// ─── GET /api/leads ───────────────────────────────────────────────────────────
// Fetch all leads with pagination, filtering, and search
router.get("/", validate(leadQuerySchema, "query"), async (req, res, next) => {
  try {
    const { page, limit, status, client_id, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (client_id) query = query.eq("client_id", client_id);
    if (search) query = query.ilike("email", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      data,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .select("*, lead_activities(*)")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead not found" });

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/leads ──────────────────────────────────────────────────────────
router.post("/", validate(createLeadSchema), async (req, res, next) => {
  try {
    const payload = req.body;

    const { data, error } = await supabase
      .from("leads")
      .insert({ ...payload, status: "new", score: 0 })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data, message: "Lead created successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/leads/:id ─────────────────────────────────────────────────────
router.patch("/:id", validate(updateLeadSchema), async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("leads")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead not found" });

    res.json({ data, message: "Lead updated successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/leads/:id ────────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("leads")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Lead deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
