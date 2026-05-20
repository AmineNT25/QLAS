/**
 * Provisions the single login account for LAS.
 *
 * LAS is an internal agency tool with exactly one operator account — there is
 * no public registration. This script makes the `users` collection contain
 * exactly one user, taken from ADMIN_EMAIL / ADMIN_PASSWORD in the environment:
 * every other account is removed and the operator account is upserted with a
 * freshly hashed password. Running it again simply re-converges to that state.
 *
 *   npm run ensure-admin
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../src/models/User.js";

dotenv.config();

async function ensureAdmin() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!uri) {
    console.error("MONGODB_URI is not set — aborting.");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set — aborting.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const passwordHash = await bcrypt.hash(password, 10);

  // Drop every other account so exactly one login remains.
  const removed = await User.deleteMany({ email: { $ne: email } });

  // Upsert the single operator account with the current password.
  await User.findOneAndUpdate(
    { email },
    { email, full_name: "Media Leo Tech", passwordHash, role: "admin" },
    { upsert: true, setDefaultsOnInsert: true }
  );

  const total = await User.countDocuments();
  console.log(`Removed ${removed.deletedCount} other account(s)`);
  console.log(`Login account ready: ${email}`);
  console.log(`Users in collection: ${total}`);

  await mongoose.disconnect();
  console.log("Done.");
}

ensureAdmin().catch((err) => {
  console.error("ensure-admin failed:", err);
  process.exit(1);
});
