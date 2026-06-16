import { chromium } from "playwright";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Scrapes Google Maps for businesses matching the query in a city.
 * Returns an array of raw business objects (not yet mapped/saved).
 */
export async function scrapeGoogleMaps({ query, city, limit = 20 }) {
  const searchQuery = `${query} in ${city}`;
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Dismiss cookie consent if present
    try {
      await page.click('button[aria-label*="Accept"], form[action*="consent"] button', {
        timeout: 5000,
      });
      await sleep(1000);
    } catch { /* no consent dialog */ }

    // CAPTCHA / block detection
    const currentUrl = page.url();
    if (currentUrl.includes("captcha") || currentUrl.includes("/sorry/")) {
      throw new Error("CAPTCHA detected. Try again later.");
    }

    // Wait for results feed
    await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

    // Scroll feed 3 times to load more results
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollBy(0, 1000);
      });
      await sleep(2000);
    }

    // Collect the business place URLs and card aria-labels from the feed
    const cardData = await page.evaluate((lim) => {
      const seen = new Set();
      const results = [];
      const links = document.querySelectorAll('div[role="feed"] a[href*="/maps/place/"]');
      for (const link of links) {
        const href = link.href;
        if (!href || seen.has(href)) continue;
        seen.add(href);
        if (results.length >= lim) break;
        results.push({
          href,
          ariaLabel: link.getAttribute("aria-label") || "",
        });
      }
      return results;
    }, limit);

    const businesses = [];

    for (const { href, ariaLabel } of cardData) {
      try {
        await sleep(Math.random() * 2000 + 1000);

        await page.goto(href, { waitUntil: "domcontentloaded", timeout: 20000 });

        // CAPTCHA check after each navigation
        if (page.url().includes("captcha") || page.url().includes("/sorry/")) {
          throw new Error("CAPTCHA detected. Try again later.");
        }

        // Wait for the detail panel to render
        await page.waitForSelector("h1", { timeout: 8000 }).catch(() => {});
        await sleep(600);

        const details = await page.evaluate(() => {
          // Business name
          const name = document.querySelector("h1")?.textContent?.trim() || "";

          // Category: the short text directly below the name (near rating area)
          let category = "";
          // button[jsaction] near the top of the panel often is the category chip
          const topButtons = Array.from(document.querySelectorAll("button[jsaction]"));
          for (const btn of topButtons) {
            const t = btn.textContent.trim();
            if (t && t.length < 60 && !t.match(/^\d/) && !t.includes("·")) {
              const rect = btn.getBoundingClientRect();
              if (rect.top > 0 && rect.top < 350) {
                category = t;
                break;
              }
            }
          }

          // Rating: decimal number like "4.5"
          let rating = null;
          const bodyText = document.body.innerText;
          const ratingMatch = bodyText.match(/\b([1-5]\.[0-9])\b/);
          if (ratingMatch) rating = parseFloat(ratingMatch[1]);

          // Review count: number in parentheses like "(123)" or "(1,234)"
          let reviewCount = null;
          const reviewMatch = bodyText.match(/\((\d[\d,]*)\)/);
          if (reviewMatch) reviewCount = parseInt(reviewMatch[1].replace(/,/g, ""), 10);

          // Phone
          const phoneLink = document.querySelector('a[href^="tel:"]');
          const phone = phoneLink
            ? phoneLink.href.replace("tel:", "").trim()
            : null;

          // Website (external link — not a Google domain)
          let website = null;
          const authorityLink = document.querySelector('a[data-item-id="authority"]');
          if (authorityLink) {
            website = authorityLink.href;
          } else {
            const extLinks = document.querySelectorAll('a[href^="http"]');
            for (const a of extLinks) {
              const h = a.href;
              if (
                !h.includes("google") &&
                !h.includes("goo.gl") &&
                !h.includes("maps.") &&
                h !== window.location.href
              ) {
                website = h;
                break;
              }
            }
          }

          // Address
          let address = null;
          const addrBtn = document.querySelector('button[data-item-id="address"]');
          if (addrBtn) {
            address = addrBtn.textContent.trim();
          } else {
            const addrEl =
              document.querySelector('[aria-label*="Address:"]') ||
              document.querySelector('[data-tooltip="Copy address"]');
            address = addrEl?.textContent?.trim() || null;
          }

          return { name, category, rating, reviewCount, phone, website, address };
        });

        if (!details.name) continue;

        // Fall back to aria-label for category if panel didn't yield one
        // aria-label format is usually: "Name · Category · Rating · …"
        let rawCategory = details.category;
        if (!rawCategory && ariaLabel) {
          const parts = ariaLabel.split("·").map((p) => p.trim());
          // Skip the first part (name) and find the first non-numeric, non-name part
          rawCategory =
            parts.find(
              (p, i) => i > 0 && p && !p.match(/^\d/) && p !== details.name
            ) || "";
        }

        businesses.push({
          businessName: details.name,
          rawCategory,
          rating: details.rating,
          reviewCount: details.reviewCount,
          phone: details.phone,
          website: details.website,
          address: details.address,
          googleMapsUrl: page.url(),
        });
      } catch (err) {
        if (err.message.includes("CAPTCHA")) throw err;
        console.error("[scraper] skipping business:", err.message);
      }
    }

    return businesses;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
