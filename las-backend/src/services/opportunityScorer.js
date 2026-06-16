/**
 * Scores a scraped business 0–100 based on how good an outreach opportunity it is.
 * Higher score = easier win (no website, bad site, reachable, high-value category).
 *
 * @param {{ rawCategory?: string, rating?: number, reviewCount?: number, website?: string, phone?: string }} business
 * @returns {Promise<number>}
 */
export async function scoreOpportunity(business) {
  const { rawCategory = "", rating, reviewCount, website, phone } = business;
  let score = 0;

  // ── REPUTATION ────────────────────────────────────────────────────────────────
  if (rating != null && rating > 4.5) score += 15;
  if (reviewCount != null) {
    if (reviewCount > 100) score += 20;
    else if (reviewCount >= 50) score += 10;
  }

  // ── WEBSITE ───────────────────────────────────────────────────────────────────
  if (!website) {
    score += 30; // no online presence — perfect agency prospect
  } else {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const start = Date.now();

      const res = await fetch(website, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      const ms = Date.now() - start;
      if (res.status >= 400) score += 20;      // broken site
      else if (ms > 3000)   score += 10;       // slow site
    } catch {
      score += 20; // unreachable — effectively broken
    }
  }

  // ── CONTACTABILITY ────────────────────────────────────────────────────────────
  if (phone) score += 10;
  if (website) score -= 5;                     // already has some presence
  if (!phone && !website) score += 15;         // hard to reach = needs agency

  // ── INDUSTRY BONUS ────────────────────────────────────────────────────────────
  const cat = rawCategory.toLowerCase();
  if (cat.includes("clinic") || cat.includes("dentist") || cat.includes("dental")) {
    score += 25;
  } else if (cat.includes("real estate") || cat.includes("immobilier") || cat.includes("property")) {
    score += 30;
  } else if (
    cat.includes("restaurant") ||
    cat.includes("café") ||
    cat.includes("cafe") ||
    cat.includes("brasserie")
  ) {
    score += 15;
  } else if (cat.includes("gym") || cat.includes("fitness") || cat.includes("musculation")) {
    score += 10;
  } else if (
    cat.includes("school") ||
    cat.includes("école") ||
    cat.includes("college") ||
    cat.includes("university")
  ) {
    score += 10;
  } else if (
    cat.includes("salon") ||
    cat.includes("beauty") ||
    cat.includes("coiffure") ||
    cat.includes("hair") ||
    cat.includes("spa")
  ) {
    score += 10;
  }

  // ── LOW-REVIEW PENALTY ────────────────────────────────────────────────────────
  if (reviewCount != null && reviewCount < 10) score -= 10;

  return Math.min(100, Math.max(0, score));
}
