/**
 * Converts any ad platform's raw webhook payload into a uniform lead shape.
 * The rest of the codebase only ever sees the returned object.
 */
export function normalizePayload(platform, raw) {
  switch (platform) {
    case "meta": {
      const fields = Object.fromEntries(
        (raw.field_data ?? []).map(({ name, values }) => [name, values?.[0] ?? null])
      );
      return {
        full_name: fields.full_name ?? fields.name ?? null,
        email:     fields.email ?? null,
        phone:     fields.phone_number ?? fields.phone ?? null,
        source:    "facebook_ads",
        metadata:  {
          leadgen_id: raw.leadgen_id,
          form_id:    raw.form_id,
          page_id:    raw.page_id,
          ...fields,
        },
      };
    }

    case "google": {
      const cols = Object.fromEntries(
        (raw.user_column_data ?? []).map(({ column_name, string_value }) => [
          column_name,
          string_value,
        ])
      );
      return {
        full_name: cols.FULL_NAME ?? null,
        email:     cols.EMAIL ?? null,
        phone:     cols.PHONE_NUMBER ?? null,
        source:    "google_ads",
        metadata:  { google_key: raw.google_key, campaign_id: raw.campaign_id, ...cols },
      };
    }

    case "linkedin": {
      const r = raw.leadFormResponse ?? {};
      return {
        full_name: [r.firstName, r.lastName].filter(Boolean).join(" ") || null,
        email:     r.emailAddress ?? null,
        phone:     null,
        source:    "linkedin_ads",
        metadata:  {
          owner:       r.owner,
          leadFormId:  r.leadFormId,
          companyName: r.companyName,
        },
      };
    }

    case "tiktok": {
      const f = raw.fields ?? {};
      return {
        full_name: f.name ?? null,
        email:     f.email ?? null,
        phone:     f.phone_number ?? null,
        source:    "tiktok_ads",
        metadata:  { advertiser_id: raw.advertiser_id, event: raw.event },
      };
    }

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}
