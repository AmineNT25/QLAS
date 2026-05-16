import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    trigger: { type: String, required: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("EmailTemplate", emailTemplateSchema);
