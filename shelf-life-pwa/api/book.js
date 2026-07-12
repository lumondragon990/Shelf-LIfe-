// api/book.js — fetches a public-domain book's full text from Project Gutenberg.
// NEW FILE: goes in the /api folder of your repo, next to claude.js.
// Public domain only — these books are legally free to read and distribute.

export default async function handler(req, res) {
  const id = String(req.query.id || "");
  if (!/^\d{1,7}$/.test(id)) {
    return res.status(400).json({ error: "Bad book id" });
  }
  try {
    // Get the book's metadata + file links from Gutendex (Gutenberg's API)
    const meta = await fetch(`https://gutendex.com/books/${id}`).then((r) => r.json());
    const formats = meta.formats || {};
    const txtUrl =
      formats["text/plain; charset=utf-8"] ||
      formats["text/plain; charset=us-ascii"] ||
      formats["text/plain; charset=iso-8859-1"] ||
      formats["text/plain"];
    if (!txtUrl) {
      return res.status(404).json({ error: "No readable text for this book" });
    }

    let text = await fetch(txtUrl).then((r) => r.text());

    // Trim Project Gutenberg's legal header/footer so the reader starts at the story
    const startMark = text.indexOf("*** START OF");
    if (startMark !== -1) {
      const afterStart = text.indexOf("\n", startMark);
      if (afterStart !== -1) text = text.slice(afterStart + 1);
    }
    const endMark = text.indexOf("*** END OF");
    if (endMark !== -1) text = text.slice(0, endMark);

    // Safety cap (very long books still fit; this guards the response size)
    if (text.length > 1_800_000) text = text.slice(0, 1_800_000);

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({
      id,
      title: meta.title || "Untitled",
      author: (meta.authors || [])[0]?.name || "",
      text: text.trim(),
    });
  } catch (e) {
    console.error("book fetch failed", e);
    return res.status(500).json({ error: "Couldn't fetch that book — try again" });
  }
}
