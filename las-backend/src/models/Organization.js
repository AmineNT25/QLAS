import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("Organization", organizationSchema);
