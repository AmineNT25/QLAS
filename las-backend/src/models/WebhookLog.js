import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema(
  {
    platform:   { type: String, required: true },
    rawPayload: { type: mongoose.Schema.Types.Mixed },
    status:     { type: String, enum: ["processed", "failed"], required: true },
    error:      { type: String, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

webhookLogSchema.index({ platform: 1, createdAt: -1 });

export default mongoose.model("WebhookLog", webhookLogSchema);
