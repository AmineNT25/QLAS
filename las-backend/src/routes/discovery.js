import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Prospect from "../models/Prospect.js";
import ScrapeJob from "../models/ScrapeJob.js";
import { scrapeGoogleMaps } from "../services/googleMapsScraper.js";
import { scoreOpportunity } from "../services/opportunityScorer.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Max 5 scrape requests per hour per IP
const scrapeLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many scrape requests. You can run up to 5 per hour." },
});

const scrapeSchema = z.object({
  query: z.string().min(2),
  city:  z.string().min(2),
  limit: z.number().int().min(1).max(50).default(20),
});

// Maps raw Google Maps category text to Prospect model enum values
function mapCategory(raw = "") {
  const c = raw.toLowerCase();
  if (c.includes("dentist") || c.includes("dental"))                          return "dentist";
  if (c.includes("clinic")  || c.includes("doctor") || c.includes("médecin") || c.includes("hospital")) return "clinic";
  if (c.includes("gym")     || c.includes("fitness") || c.includes("musculation")) return "gym";
  if (c.includes("school")  || c.includes("école")  || c.includes("college") || c.includes("university")) return "school";
  if (c.includes("real estate") || c.includes("immobilier") || c.includes("property")) return "real_estate";
  if (c.includes("salon")   || c.includes("beauty") || c.includes("coiffure") || c.includes("hair") || c.includes("spa")) return "salon";
  if (c.includes("restaurant") || c.includes("café") || c.includes("cafe")   || c.includes("brasserie")) return "restaurant";
  return "other";
}

// Escapes special regex characters to safely use a string in a $regex query
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── POST /api/discovery/scrape ────────────────────────────────────────────────
// Returns 202 immediately; scraping runs in the background.
router.post("/scrape", scrapeLimit, async (req, res, next) => {
  try {
    const parsed = scrapeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Validation failed",
        errors: parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { query, city, limit } = parsed.data;
    const organizationId = req.user.organizationId;

    const job = await new ScrapeJob({ organizationId, query, city, limit, status: "processing" }).save();

    // Respond immediately — do not await the scrape
    res.status(202).json({ jobId: job._id, status: "processing" });

    // Background scrape
    const startTime = Date.now();
    scrapeGoogleMaps({ query, city, limit })
      .then(async (businesses) => {
        let saved = 0;
        let skipped = 0;
        const savedIds = [];

        for (const biz of businesses) {
          // Skip duplicates within this organization (same name + city, case-insensitive)
          const exists = await Prospect.exists({
            organizationId,
            businessName: { $regex: `^${escapeRegex(biz.businessName)}$`, $options: "i" },
            city:         { $regex: `^${escapeRegex(city)}$`,            $options: "i" },
          });

          if (exists) { skipped++; continue; }

          const opportunityScore = await scoreOpportunity(biz);
          const category         = mapCategory(biz.rawCategory);

          const prospect = await new Prospect({
            organizationId,
            businessName:     biz.businessName,
            category,
            city,
            address:          biz.address    || undefined,
            phone:            biz.phone      || undefined,
            website:          biz.website    || undefined,
            googleMapsUrl:    biz.googleMapsUrl || undefined,
            rating:           biz.rating     ?? undefined,
            reviewCount:      biz.reviewCount ?? undefined,
            opportunityScore,
            noWebsite:        !biz.website,
            source:           "discovery",
            status:           "not_contacted",
          }).save();

          savedIds.push(prospect._id);
          saved++;
        }

        await ScrapeJob.findByIdAndUpdate(job._id, {
          status:    "done",
          found:     businesses.length,
          saved,
          skipped,
          prospects: savedIds,
          duration:  Date.now() - startTime,
        });
      })
      .catch(async (err) => {
        console.error("[discovery] scrape failed:", err.message);
        await ScrapeJob.findByIdAndUpdate(job._id, {
          status:   "failed",
          error:    err.message,
          duration: Date.now() - startTime,
        });
      });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/discovery/status/:jobId ─────────────────────────────────────────
router.get("/status/:jobId", async (req, res, next) => {
  try {
    const job = await ScrapeJob.findOne({
      _id:            req.params.jobId,
      organizationId: req.user.organizationId,
    })
      .populate("prospects")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/discovery/history ────────────────────────────────────────────────
router.get("/history", async (req, res, next) => {
  try {
    const history = await ScrapeJob.find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("query city status found saved skipped createdAt duration")
      .lean();
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
