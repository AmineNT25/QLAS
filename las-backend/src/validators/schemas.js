import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// ─── Lead Schemas ─────────────────────────────────────────────────────────────
// Public capture (embed snippet / API): a lead must be attributable to a
// tenant, either directly via `clientId` or indirectly via `formId` (the
// route derives clientId from the form and ignores any client-supplied one).
export const createLeadSchema = z
  .object({
    clientId: objectId.optional(),
    formId: objectId.optional(),
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
  })
  .refine((d) => d.clientId || d.formId, {
    message: "Either clientId or formId is required",
    path: ["clientId"],
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

// ─── Activity Schema ──────────────────────────────────────────────────────────
export const createActivitySchema = z.object({
  type: z.string().min(1, "Activity type is required").max(64),
  description: z.string().max(2000).optional(),
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

// ─── Embed Schema ─────────────────────────────────────────────────────────────
// Validates the :formId path param for GET /api/embed/:formId.
export const embedParamSchema = z.object({
  formId: objectId,
});

// ─── Client Schemas ───────────────────────────────────────────────────────────
const urlOrEmpty = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional();

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  industry: z.string().trim().max(120).optional(),
  website: urlOrEmpty,
});

export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    industry: z.string().trim().max(120).optional(),
    website: urlOrEmpty,
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "No fields to update",
  });

export const clientIdParamSchema = z.object({
  id: objectId,
});

// ─── Form Schemas ─────────────────────────────────────────────────────────────
const formFieldSchema = z.object({
  label: z.string().min(1, "Field label is required"),
  type: z.string().min(1, "Field type is required"),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});

export const createFormSchema = z.object({
  name: z.string().trim().min(1, "Form name is required"),
  fields: z.array(formFieldSchema).default([]),
  isActive: z.boolean().optional(),
});

export const updateFormSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    fields: z.array(formFieldSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "No fields to update",
  });

export const formIdParamSchema = z.object({
  id: objectId,
});
