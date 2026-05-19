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
import clientsRouter from "./routes/clients.js";
import webhooksRouter from "./routes/webhooks.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
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
app.use("/api/auth",     authRouter);
app.use("/api/stats",    statsRouter);
app.use("/api/leads",    leadsRouter);
app.use("/api/forms",    formsRouter);
app.use("/api/clients",  clientsRouter);
app.use("/api/webhooks", webhooksRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`LAS API running on port ${PORT}`);
  });
});

export default app;
