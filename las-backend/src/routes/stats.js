import { Router } from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";

const router = Router();

const OBJECT_ID = /^[a-f\d]{24}$/i;

// GET /api/stats — dashboard metrics, filtered by X-Client-Id header.
router.get("/", async (req, res, next) => {
  try {
    const rawClientId = (req.headers["x-client-id"] || "").trim();
    if (!rawClientId || !OBJECT_ID.test(rawClientId)) {
      return res.status(400).json({ message: "X-Client-Id header is required." });
    }
    const clientId = new mongoose.Types.ObjectId(rawClientId);

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

      Lead.countDocuments({ clientId: rawClientId }),
    ]);

    const STATUS_ORDER = ["new", "contacted", "qualified", "converted", "lost"];
    const statusMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
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
