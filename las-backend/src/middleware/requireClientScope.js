import Client from "../models/Client.js";

const OBJECT_ID = /^[a-f\d]{24}$/i;
const COOKIE_NAME = "qlas_active_client";

/**
 * Parses a single cookie value out of a raw `Cookie:` header without
 * pulling in cookie-parser. Returns undefined if absent.
 */
function readCookie(header, name) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

/**
 * Tenant-isolation guard. MongoDB has no row-level security, so every
 * authenticated dashboard request must run inside a single client's scope.
 *
 * Resolution order for the active client id:
 *   1. `X-Client-Id` request header (sent by the SPA axios client)
 *   2. `qlas_active_client` cookie (fallback / SSR)
 *
 * The id is then verified to belong to the authenticated user
 * (`Client.createdBy === req.user.sub`) so a tenant cannot read another
 * tenant's data by forging the header. On success it sets:
 *   - `req.clientId`            the validated ObjectId string
 *   - `req.scoped(filter?)`     helper that injects `{ clientId }`
 *
 * Must run after `requireAuth`.
 */
export async function requireClientScope(req, res, next) {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const headerId = req.headers["x-client-id"];
    const cookieId = readCookie(req.headers.cookie, COOKIE_NAME);
    const clientId = (headerId || cookieId || "").trim();

    if (!clientId) {
      return res.status(400).json({
        message:
          "No active client selected. Choose a client in Settings before continuing.",
      });
    }

    if (!OBJECT_ID.test(clientId)) {
      return res.status(400).json({ message: "Invalid active client id." });
    }

    const client = await Client.findOne({
      _id: clientId,
      createdBy: req.user.sub,
    }).select("_id");

    if (!client) {
      return res.status(403).json({
        message: "Active client not found or not accessible by this account.",
      });
    }

    req.clientId = String(client._id);
    req.scoped = (filter = {}) => ({ ...filter, clientId: req.clientId });

    next();
  } catch (err) {
    next(err);
  }
}

export default requireClientScope;
