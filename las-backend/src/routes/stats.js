import { Router } from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import { requireAuth } from "../middleware/auth.js";
import { requireClientScope } from "../middleware/requireClientScope.js";

const router = Router();

// GET /api/stats — dashboard metrics, scoped to the active client.
router.get("/", requireAuth, requireClientScope, async (req, res, next) => {
  try {
    const clientId = new mongoose.Types.ObjectId(req.clientId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [statusCounts, dailyLeads, scoreStats, total] = await Promise.all([
      Lead.aggregate([
        { $match: { clientId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Lead.aggregate([
        { $match: { clientId, createdAt: { $gte: thirtyDaysAgo } } },
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
        { $match: { clientId } },
        { $group: { _id: null, avg: { $avg: "$score" }, max: { $max: "$score" } } },
      ]),

      Lead.countDocuments({ clientId: req.clientId }),
    ]);

    const STATUS_ORDER = ["new", "contacted", "qualified", "converted", "lost"];
    const statusMap = Object.fromEntries(
      statusCounts.map((s) => [s._id, s.count])
    );
    const byStatus = STATUS_ORDER.map((s) => ({
      status: s,
      count: statusMap[s] ?? 0,
    }));

    const converted = statusMap["converted"] ?? 0;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    res.json({
      total,
      conversionRate,
      avgScore: Math.round(scoreStats[0]?.avg ?? 0),
      byStatus,
      dailyLeads,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
