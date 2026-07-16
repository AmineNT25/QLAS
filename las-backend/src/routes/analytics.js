import { Router } from "express";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";

const router = Router();

const OBJECT_ID = /^[a-f\d]{24}$/i;

// ─── GET /api/analytics — filtered by X-Client-Id header.
router.get("/", async (req, res, next) => {
  try {
    const rawClientId = (req.headers["x-client-id"] || "").trim();
    if (!rawClientId || !OBJECT_ID.test(rawClientId)) {
      return res.status(400).json({ message: "X-Client-Id header is required." });
    }
    const clientId = new mongoose.Types.ObjectId(rawClientId);

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
