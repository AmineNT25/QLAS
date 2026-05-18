import { z } from "zod";
import Lead from "../models/Lead.js";
import ScoringRule from "../models/ScoringRule.js";

const leadIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid lead ID");

/**
 * Resolves a dot-notation field path against a lead document.
 * Supports top-level fields and metadata.<key> paths.
 */
function resolveField(lead, field) {
  if (field.startsWith("metadata.")) {
    const key = field.slice("metadata.".length);
    return lead.metadata?.[key];
  }
  return lead[field];
}

/**
 * Scores a lead by summing all matching ScoringRule points for its client,
 * clamps the result to [0, 100], persists it, and returns the new score.
 */
export async function scoreLead(leadId) {
  leadIdSchema.parse(leadId);

  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const rules = await ScoringRule.find({ clientId: lead.clientId });

  let total = 0;
  for (const rule of rules) {
    const fieldValue = resolveField(lead, rule.conditionField);
    if (String(fieldValue ?? "") === rule.conditionValue) {
      total += rule.points;
    }
  }

  const score = Math.min(100, Math.max(0, total));
  lead.score = score;
  await lead.save();

  return score;
}
