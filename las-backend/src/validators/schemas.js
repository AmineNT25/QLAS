import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     z.string().min(8, "New password must be at least 8 characters"),
});

// ─── Lead Schemas ─────────────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  formId: z.string().optional(),
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(1, "Full name is required").optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  status: z
    .enum(["new", "contacted", "qualified", "converted", "lost"])
    .optional(),
  score: z.number().int().min(0).max(100).optional(),
  fullName: z.string().min(1).optional(),
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
  clientId: z.string().optional(),
  search: z.string().optional(),
});

// ─── Score Lead Schema ────────────────────────────────────────────────────────
export const leadIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid lead ID"),
});

// ─── Form Submission Schema ───────────────────────────────────────────────────
export const formSubmitSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
