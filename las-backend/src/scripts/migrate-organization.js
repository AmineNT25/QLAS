/**
 * One-time migration: backfill organizationId on all pre-multi-tenancy documents.
 *
 * Strategy:
 *   1. Find the first User in the DB (the original account).
 *   2. Create (or find) a "Legacy" Organization owned by that user.
 *   3. Set organizationId on that user and any other users without one.
 *   4. Backfill all Client, Prospect, and ScrapeJob documents that lack organizationId.
 *
 * Safe to run multiple times — all operations use upserts / conditional updates.
 *
 * Usage:
 *   node --experimental-vm-modules src/scripts/migrate-organization.js
 * or with the npm script defined in package.json:
 *   npm run migrate:org
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

// Import models (after dotenv so env is available)
import User         from "../models/User.js";
import Organization from "../models/Organization.js";
import Client       from "../models/Client.js";
import Prospect     from "../models/Prospect.js";
import ScrapeJob    from "../models/ScrapeJob.js";

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // ── 1. Find or pick the seed user ──────────────────────────────────────────
  const seedUser = await User.findOne().sort({ createdAt: 1 }).lean();
  if (!seedUser) {
    console.log("No users found — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }
  console.log(`Seed user: ${seedUser.email} (${seedUser._id})`);

  // ── 2. Create (or reuse) the Legacy organization ───────────────────────────
  let org = await Organization.findOne({ ownerId: seedUser._id }).lean();
  if (!org) {
    org = await Organization.create({
      name:    seedUser.full_name?.trim() || seedUser.email,
      ownerId: seedUser._id,
    });
    console.log(`Created legacy organization: "${org.name}" (${org._id})`);
  } else {
    console.log(`Reusing existing organization: "${org.name}" (${org._id})`);
  }

  const orgId = org._id;

  // ── 3. Backfill users ──────────────────────────────────────────────────────
  const usersResult = await User.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: orgId } }
  );
  console.log(`Users backfilled: ${usersResult.modifiedCount}`);

  // ── 4. Backfill clients ────────────────────────────────────────────────────
  const clientsResult = await Client.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: orgId } }
  );
  console.log(`Clients backfilled: ${clientsResult.modifiedCount}`);

  // ── 5. Backfill prospects ──────────────────────────────────────────────────
  const prospectsResult = await Prospect.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: orgId } }
  );
  console.log(`Prospects backfilled: ${prospectsResult.modifiedCount}`);

  // ── 6. Backfill scrape jobs ────────────────────────────────────────────────
  const jobsResult = await ScrapeJob.updateMany(
    { organizationId: { $exists: false } },
    { $set: { organizationId: orgId } }
  );
  console.log(`ScrapeJobs backfilled: ${jobsResult.modifiedCount}`);

  console.log("\nMigration complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
