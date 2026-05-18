import { Router } from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import { requireAuth } from "../middleware/auth.js";
import { requireClientScope } from "../middleware/requireClientScope.js";

const router = Router();

// ─── GET /api/analytics ───────────────────────────────────────────────────────
// Scoped to the single active client (validated by requireClientScope).
router.get("/", requireAuth, requireClientScope, async (req, res, next) => {
  try {
    const clientId = new mongoose.Types.ObjectId(req.clientId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const baseMatch = { clientId };

    const [bySource, dailyLeads, byStatus] = await Promise.all([
      Lead.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { $ifNull: ["$source", "unknown"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $project: { _id: 0, source: "$_id", count: 1 } },
      ]),

      Lead.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ]),

      Lead.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
      ]),
    ]);

    res.json({ data: { bySource, dailyLeads, byStatus } });
  } catch (err) {
    next(err);
  }
});

export default router;
