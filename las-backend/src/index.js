import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import leadsRouter from "./routes/leads.js";
import formsRouter from "./routes/forms.js";
import authRouter from "./routes/auth.js";
import statsRouter from "./routes/stats.js";
import analyticsRouter from "./routes/analytics.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/stats", statsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/forms", formsRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`LAS API running on port ${PORT}`);
  });
});

export default app;
