import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { loginSchema, changePasswordSchema } from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function signTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
  return { accessToken, refreshToken };
}

// LAS is an internal agency tool — there is no public registration.
// The single operator account is provisioned via scripts/ensure-admin.js.

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid email or password." });

    const tokens = signTokens({ sub: user._id, email: user.email, role: user.role });
    res.json({ ...tokens, user: { id: user._id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select("email full_name role createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      data: { id: user._id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/auth/password ─────────────────────────────────────────────────
router.patch("/password", requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: "Refresh token required." });

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
    );

    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token." });
  }
});

export default router;
