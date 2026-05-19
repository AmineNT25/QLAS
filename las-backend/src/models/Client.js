import mongoose from "mongoose";

const integrationPlatformSchema = (extraFields = {}) =>
  new mongoose.Schema(
    { accessToken: { type: String }, ...extraFields },
    { _id: false }
  );

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    integrations: {
      meta:     integrationPlatformSchema({ pageId: String, formId: String }),
      google:   integrationPlatformSchema({ customerId: String }),
      linkedin: integrationPlatformSchema({ organizationId: String }),
      tiktok:   integrationPlatformSchema({ advertiserId: String }),
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

// Strip accessTokens from any JSON output so they never appear in API responses.
clientSchema.set("toJSON", {
  transform(_doc, ret) {
    for (const platform of ["meta", "google", "linkedin", "tiktok"]) {
      if (ret.integrations?.[platform]) {
        delete ret.integrations[platform].accessToken;
      }
    }
    return ret;
  },
});

export default mongoose.model("Client", clientSchema);
