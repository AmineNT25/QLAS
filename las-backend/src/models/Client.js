import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("Client", clientSchema);
