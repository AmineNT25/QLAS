import { Router } from "express";
import Lead from "../models/Lead.js";
import Client from "../models/Client.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All analytics queries are scoped to leads belonging to clients owned
// by the authenticated user (Client.createdBy === req.user.sub).
async function getUserClientIds(userId) {
  const clients = await Client.find({ createdBy: userId }).select("_id");
  return clients.map((c) => c._id);
}

// ─── GET /api/analytics ───────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const clientIds = await getUserClientIds(req.user.sub);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const baseMatch = { clientId: { $in: clientIds } };

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
