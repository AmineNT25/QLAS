import { Router } from "express";
import Prospect from "../models/Prospect.js";

const router = Router();

const VALID_STATUSES = [
  "not_contacted", "contacted", "interested",
  "meeting_scheduled", "proposal_sent", "client_won",
];

// GET /api/prospects/stats
router.get("/stats", async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalAll,
      highOpp,
      inPipeline,
      clientsWon,
      discoveredThisMonth,
      statusCounts,
      overTime,
      scoreStats,
    ] = await Promise.all([
      Prospect.countDocuments({}),
      Prospect.countDocuments({ opportunityScore: { $gte: 70 } }),
      Prospect.countDocuments({ status: { $ne: "not_contacted" } }),
      Prospect.countDocuments({ status: "client_won" }),
      Prospect.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Prospect.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
      Prospect.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),
      Prospect.aggregate([
        { $group: { _id: null, avg: { $avg: "$opportunityScore" } } },
      ]),
    ]);

    const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));
    const prospectsByStatus = VALID_STATUSES.map((s) => ({
      status: s,
      count: statusMap[s] ?? 0,
    }));

    const winRate =
      totalAll > 0 ? Math.round(((statusMap["client_won"] ?? 0) / totalAll) * 100) : 0;

    res.json({
      totalProspects: totalAll,
      highOpportunity: highOpp,
      inPipeline,
      clientsWon,
      discoveredThisMonth,
      winRate,
      avgOpportunityScore: Math.round(scoreStats[0]?.avg ?? 0),
      prospectsByStatus,
      prospectsOverTime: overTime,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prospects/analytics
router.get("/analytics", async (req, res, next) => {
  try {
    const [byCategory, byCity, scoreDistribution, topProspects, statusCounts] =
      await Promise.all([
        Prospect.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, category: "$_id", count: 1 } },
        ]),
        Prospect.aggregate([
          { $group: { _id: "$city", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
          { $project: { _id: 0, city: "$_id", count: 1 } },
        ]),
        Prospect.aggregate([
          {
            $bucket: {
              groupBy: "$opportunityScore",
              boundaries: [0, 40, 70, 101],
              default: "other",
              output: { count: { $sum: 1 } },
            },
          },
        ]),
        Prospect.find({})
          .sort({ opportunityScore: -1 })
          .limit(5)
          .lean(),
        Prospect.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ]),
      ]);

    const rangeLabels = { 0: "Low (0–39)", 40: "Medium (40–69)", 70: "High (70–100)" };
    const byOpportunityScore = scoreDistribution
      .filter((b) => b._id !== "other")
      .map((b) => ({ range: rangeLabels[b._id] ?? String(b._id), count: b.count }));

    const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s.count]));
    const conversionFunnel = Object.fromEntries(
      VALID_STATUSES.map((s) => [s, statusMap[s] ?? 0])
    );

    res.json({
      byCategory,
      byCity,
      byOpportunityScore,
      topProspects,
      conversionFunnel,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/prospects
router.get("/", async (req, res, next) => {
  try {
    const {
      city, category, status, minScore, maxScore,
      noWebsite, search, groupBy, page = "1", limit = "20",
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

    // groupBy=status — return all prospects bucketed by status
    if (groupBy === "status") {
      const all = await Prospect.find(filter)
        .sort({ opportunityScore: -1 })
        .lean();

      const grouped = Object.fromEntries(VALID_STATUSES.map((s) => [s, []]));
      for (const p of all) grouped[p.status]?.push(p);

      return res.json({ grouped, total: all.length });
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
        Prospect.distinct("city", {}),
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
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
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
