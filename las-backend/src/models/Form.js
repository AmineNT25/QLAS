import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    label: String,
    type: String,
    placeholder: String,
    required: { type: Boolean, default: false },
    options: [String],
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true, trim: true },
    fields: [fieldSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model("Form", formSchema);
