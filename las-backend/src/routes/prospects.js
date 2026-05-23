import { Router } from "express";
import Prospect from "../models/Prospect.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/prospects
router.get("/", async (req, res, next) => {
  try {
    const {
      city, category, status, minScore, maxScore,
      noWebsite, search, page = "1", limit = "20",
    } = req.query;

    const filter = {};

    if (city)     filter.city     = { $regex: city, $options: "i" };
    if (category) filter.category = category;
    if (status)   filter.status   = status;
    if (noWebsite === "true") filter.noWebsite = true;

    if (minScore !== undefined || maxScore !== undefined) {
      filter.opportunityScore = {};
      if (minScore !== undefined) filter.opportunityScore.$gte = Number(minScore);
      if (maxScore !== undefined) filter.opportunityScore.$lte = Number(maxScore);
    }

    if (search) {
      filter.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { city:         { $regex: search, $options: "i" } },
      ];
    }

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [prospects, total, totalAll, highOpp, inPipeline, clientsWon, cities] =
      await Promise.all([
        Prospect.find(filter)
          .sort({ opportunityScore: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Prospect.countDocuments(filter),
        Prospect.countDocuments({}),
        Prospect.countDocuments({ opportunityScore: { $gte: 70 } }),
        Prospect.countDocuments({ status: { $ne: "not_contacted" } }),
        Prospect.countDocuments({ status: "client_won" }),
        Prospect.distinct("city"),
      ]);

    res.json({
      prospects,
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
      stats:      { total: totalAll, highOpportunity: highOpp, inPipeline, clientsWon },
      cities:     cities.sort(),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prospects
router.post("/", async (req, res, next) => {
  try {
    const { website, ...rest } = req.body;
    const prospect = await new Prospect({
      ...rest,
      website:          website || undefined,
      noWebsite:        !website,
      opportunityScore: 0,
      source:           "manual",
    }).save();
    res.status(201).json({ data: prospect });
  } catch (err) {
    next(err);
  }
});

// GET /api/prospects/:id
router.get("/:id", async (req, res, next) => {
  try {
    const prospect = await Prospect.findById(req.params.id).lean();
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    res.json({ data: prospect });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/prospects/:id/status
router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    const prospect = await Prospect.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).lean();
    if (!prospect) return res.status(404).json({ message: "Prospect not found" });
    res.json({ data: prospect });
  } catch (err) {
    next(err);
  }
});

export default router;
