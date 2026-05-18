import { Router } from "express";
import Form from "../models/Form.js";
import { embedParamSchema } from "../validators/schemas.js";
import { validate } from "../middleware/validate.js";

const router = Router();

/**
 * Resolves the public-facing API origin. Honours an explicit override
 * (useful behind reverse proxies / CDNs) and otherwise reflects the
 * request that loaded the snippet.
 */
function apiOrigin(req) {
  if (process.env.PUBLIC_API_URL) {
    return process.env.PUBLIC_API_URL.replace(/\/+$/, "");
  }
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}`;
}

/**
 * Serialises a value for safe inlining into a <script> body. Escaping `<`
 * prevents a `</script>` inside form data from terminating the tag if the
 * snippet is ever pasted inline rather than referenced via src.
 */
function toJs(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * GET /api/embed/:formId
 *
 * Returns a self-contained, dependency-free JavaScript snippet. Dropping
 *   <script src="<API>/api/embed/<formId>" async></script>
 * into any external site renders the form and POSTs submissions to
 * POST /api/leads (clientId is derived server-side from the form).
 */
router.get(
  "/:formId",
  validate(embedParamSchema, "params"),
  async (req, res, next) => {
    try {
      const form = await Form.findOne({
        _id: req.params.formId,
        isActive: true,
      }).lean();

      if (!form) {
        // Still serve valid JS so the host page console shows a clear reason.
        res.type("application/javascript");
        return res
          .status(404)
          .send(
            `console.error("[QLAS] Form ${toJs(
              req.params.formId
            )} not found or inactive.");`
          );
      }

      const config = {
        formId: String(form._id),
        name: form.name || "Contact us",
        api: apiOrigin(req),
        fields: (form.fields || []).map((f) => ({
          label: f.label || "",
          type: f.type || "text",
          placeholder: f.placeholder || "",
          required: !!f.required,
          options: Array.isArray(f.options) ? f.options : [],
        })),
      };

      res.set("Cache-Control", "public, max-age=300");
      res.type("application/javascript");
      res.send(buildSnippet(config));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Generates the IIFE that renders the form on the host page. Vanilla JS,
 * no external dependencies, scoped styles, idempotent against double
 * injection of the same form.
 */
function buildSnippet(config) {
  return `(function () {
  "use strict";
  var CFG = ${toJs(config)};
  if (window.__qlasMounted && window.__qlasMounted[CFG.formId]) return;
  window.__qlasMounted = window.__qlasMounted || {};
  window.__qlasMounted[CFG.formId] = true;

  var current = document.currentScript;
  function mount() {
    var host = document.createElement("div");
    host.className = "qlas-form qlas-form-" + CFG.formId;
    if (current && current.parentNode) {
      current.parentNode.insertBefore(host, current.nextSibling);
    } else {
      document.body.appendChild(host);
    }

    var style = document.createElement("style");
    style.textContent =
      ".qlas-form{max-width:420px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937}" +
      ".qlas-form h3{margin:0 0 12px;font-size:18px;font-weight:600}" +
      ".qlas-form label{display:block;font-size:13px;font-weight:500;margin:10px 0 4px}" +
      ".qlas-form input,.qlas-form textarea,.qlas-form select{width:100%;box-sizing:border-box;padding:8px 10px;font-size:14px;border:1px solid #d1d5db;border-radius:8px;background:#fff}" +
      ".qlas-form input:focus,.qlas-form textarea:focus,.qlas-form select:focus{outline:2px solid #3b82f6;outline-offset:-1px}" +
      ".qlas-form button{margin-top:14px;width:100%;padding:9px 14px;font-size:14px;font-weight:600;color:#fff;background:#2563eb;border:0;border-radius:8px;cursor:pointer}" +
      ".qlas-form button:disabled{opacity:.6;cursor:not-allowed}" +
      ".qlas-form .qlas-msg{margin-top:12px;font-size:13px}" +
      ".qlas-form .qlas-ok{color:#047857}.qlas-form .qlas-err{color:#dc2626}";
    host.appendChild(style);

    var form = document.createElement("form");
    form.setAttribute("novalidate", "");

    var title = document.createElement("h3");
    title.textContent = CFG.name;
    form.appendChild(title);

    function fieldKey(f, i) {
      var l = (f.label || ("field_" + i)).toLowerCase();
      if (f.type === "email" || /\\bemail\\b/.test(l)) return "email";
      if (f.type === "tel" || f.type === "phone" || /\\bphone\\b/.test(l)) return "phone";
      if (/(full ?name|^name$)/.test(l)) return "fullName";
      return "meta:" + l.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }

    var inputs = [];
    CFG.fields.forEach(function (f, i) {
      var id = "qlas-" + CFG.formId + "-" + i;
      var label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = f.label + (f.required ? " *" : "");
      form.appendChild(label);

      var el;
      if (f.type === "textarea") {
        el = document.createElement("textarea");
        el.rows = 4;
      } else if (f.type === "select") {
        el = document.createElement("select");
        var blank = document.createElement("option");
        blank.value = "";
        blank.textContent = f.placeholder || "Select…";
        el.appendChild(blank);
        (f.options || []).forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          el.appendChild(o);
        });
      } else {
        el = document.createElement("input");
        el.type =
          f.type === "email" ? "email" :
          f.type === "phone" || f.type === "tel" ? "tel" :
          f.type === "number" ? "number" : "text";
      }
      el.id = id;
      if (f.placeholder && f.type !== "select") el.placeholder = f.placeholder;
      if (f.required) el.required = true;
      el.__key = fieldKey(f, i);
      inputs.push(el);
      form.appendChild(el);
    });

    var btn = document.createElement("button");
    btn.type = "submit";
    btn.textContent = "Submit";
    form.appendChild(btn);

    var msg = document.createElement("div");
    msg.className = "qlas-msg";
    form.appendChild(msg);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.textContent = "";
      msg.className = "qlas-msg";

      var payload = { formId: CFG.formId, metadata: {} };
      var missing = false;
      inputs.forEach(function (el) {
        var v = (el.value || "").trim();
        if (el.required && !v) missing = true;
        if (!v) return;
        var k = el.__key;
        if (k.indexOf("meta:") === 0) payload.metadata[k.slice(5)] = v;
        else payload[k] = v;
      });

      if (missing || !payload.email) {
        msg.className = "qlas-msg qlas-err";
        msg.textContent = "Please fill in all required fields.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Submitting…";

      fetch(CFG.api + "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(function (body) {
            return { ok: r.ok, body: body };
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error((res.body && res.body.message) || "Submission failed");
          form.reset();
          msg.className = "qlas-msg qlas-ok";
          msg.textContent = "Thanks! Your submission has been received.";
        })
        .catch(function (err) {
          msg.className = "qlas-msg qlas-err";
          msg.textContent = err.message || "Something went wrong. Please try again.";
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Submit";
        });
    });

    host.appendChild(form);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();`;
}

export default router;
