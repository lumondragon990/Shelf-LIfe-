// api/gbooks.js — proxies Google Books searches through the server, so ad-blockers,
// privacy browsers, and network filters on the reader's device can't break
// fresh releases or book summaries.
// NEW FILE: goes in shelf-life-pwa/api/ next to claude.js and book.js

export default async function handler(req, res) {
  const q = String(req.query.q || "").slice(0, 200);
  if (!q) return res.status(400).json({ error: "Missing q" });

  const params = new URLSearchParams({ q, maxResults: String(Math.min(parseInt(req.query.maxResults) || 12, 40)) });
  if (req.query.orderBy === "newest") params.set("orderBy", "newest");
  if (/^[a-z]{2}$/.test(req.query.langRestrict || "")) params.set("langRestrict", req.query.langRestrict);
  params.set("country", "US"); // avoids Google's regional 403s

  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
    const d = await r.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json(d);
  } catch (e) {
    console.error("gbooks proxy failed", e);
    return res.status(502).json({ error: "Book service unreachable" });
  }
}
