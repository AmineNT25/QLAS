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
import clientsRouter from "./routes/clients.js";
import webhooksRouter from "./routes/webhooks.js";
import embedRouter from "./routes/embed.js";
import prospectsRouter from "./routes/prospects.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Origin is reflected (not "*") because the embed snippet runs on arbitrary
// third-party sites. Auth is Bearer-token based, so no cookie credentials.
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-Id"],
  })
);
// Capture raw body buffer so webhook routes can verify HMAC signatures.
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRouter);
app.use("/api/stats",     statsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/leads",     leadsRouter);
app.use("/api/forms",     formsRouter);
app.use("/api/clients",   clientsRouter);
app.use("/api/webhooks",  webhooksRouter);
app.use("/api/embed",      embedRouter);
app.use("/api/prospects", prospectsRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`LAS API running on port ${PORT}`);
  });
});

export default app;
