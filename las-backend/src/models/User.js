import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    full_name: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role:           { type: String, enum: ["owner", "member"], default: "member" },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("User", userSchema);
