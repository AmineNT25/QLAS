/**
 * Migration: drop legacy agency fields from User documents.
 *
 * The old Settings "Profile" tab stored agency-wide branding (companyName,
 * companyLogo, companyWebsite) on every User. Agency branding now lives in
 * environment variables (AGENCY_NAME, AGENCY_LOGO_URL, ...) and is injected
 * into emails at send time, so these per-user fields are obsolete.
 *
 * This script $unsets them from existing documents. It is idempotent —
 * running it again after a clean pass simply matches nothing.
 *
 *   node scripts/unset-company-fields.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const LEGACY_FIELDS = ["companyName", "companyLogo", "companyWebsite"];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set — aborting.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const users = mongoose.connection.collection("users");

  // Only touch documents that still carry at least one legacy field.
  const filter = { $or: LEGACY_FIELDS.map((f) => ({ [f]: { $exists: true } })) };
  const unset = Object.fromEntries(LEGACY_FIELDS.map((f) => [f, ""]));

  const affected = await users.countDocuments(filter);
  const result = await users.updateMany(filter, { $unset: unset });

  console.log(`Matched ${affected} user document(s) with legacy fields`);
  console.log(`Modified ${result.modifiedCount} document(s): unset ${LEGACY_FIELDS.join(", ")}`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
