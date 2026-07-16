import { Schema, model } from "mongoose";

const prospectSchema = new Schema(
  {
    businessName:     { type: String, required: true, trim: true },
    category:         {
      type: String,
      enum: ["restaurant", "clinic", "dentist", "gym", "school", "real_estate", "salon", "other"],
      required: true,
    },
    city:             { type: String, required: true, trim: true },
    address:          { type: String, trim: true },
    phone:            { type: String },
    whatsapp:         { type: String },
    website:          { type: String },
    googleMapsUrl:    { type: String },
    rating:           { type: Number, min: 0, max: 5 },
    reviewCount:      { type: Number, min: 0 },
    opportunityScore: { type: Number, default: 0, min: 0, max: 100 },
    status:           {
      type: String,
      enum: ["not_contacted", "contacted", "interested", "meeting_scheduled", "proposal_sent", "client_won"],
      default: "not_contacted",
    },
    noWebsite:        { type: Boolean, default: false },
    notes:            { type: String },
    aiSummary:        { type: String },
    source:           { type: String, enum: ["manual", "discovery"], default: "manual" },
  },
  { timestamps: true }
);

prospectSchema.index({ city: 1 });
prospectSchema.index({ status: 1 });
prospectSchema.index({ opportunityScore: -1 });
prospectSchema.index({ businessName: "text", city: "text" });

export default model("Prospect", prospectSchema);
