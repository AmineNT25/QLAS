import { z } from "zod";

// ─── Lead Schema ──────────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  client_id: z.string().uuid("Invalid client_id"),
  form_id: z.string().uuid("Invalid form_id"),
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required").optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  // UTM tracking
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  // Arbitrary extra fields captured from the form
  metadata: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  score: z.number().int().min(0).max(100).optional(),
  full_name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export const leadQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => parseInt(v ?? "1", 10)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(parseInt(v ?? "20", 10), 100)),
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  client_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

// ─── Form Submission Schema ───────────────────────────────────────────────────
export const formSubmitSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
