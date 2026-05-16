import mongoose from "mongoose";

const leadActivitySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, required: true },
    description: String,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("LeadActivity", leadActivitySchema);
