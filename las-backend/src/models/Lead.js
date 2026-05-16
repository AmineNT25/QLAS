import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    email: { type: String, required: true, lowercase: true, trim: true },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    score: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "lost"],
      default: "new",
    },
    source: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

leadSchema.index({ clientId: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

export default mongoose.model("Lead", leadSchema);
