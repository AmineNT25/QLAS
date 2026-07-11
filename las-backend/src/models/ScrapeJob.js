import mongoose, { Schema, model } from "mongoose";

const scrapeJobSchema = new Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
    query:    { type: String, required: true },
    city:     { type: String, required: true },
    limit:    { type: Number, default: 20 },
    status:   { type: String, enum: ["processing", "done", "failed"], default: "processing" },
    found:    { type: Number, default: 0 },
    saved:    { type: Number, default: 0 },
    skipped:  { type: Number, default: 0 },
    prospects:[{ type: Schema.Types.ObjectId, ref: "Prospect" }],
    error:    { type: String },
    duration: { type: Number },
  },
  { timestamps: true }
);

scrapeJobSchema.index({ createdAt: -1 });

export default model("ScrapeJob", scrapeJobSchema);
