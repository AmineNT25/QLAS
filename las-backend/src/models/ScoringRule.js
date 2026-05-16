import mongoose from "mongoose";

const scoringRuleSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  conditionField: { type: String, required: true },
  conditionValue: { type: String, required: true },
  points: { type: Number, required: true },
});

export default mongoose.model("ScoringRule", scoringRuleSchema);
