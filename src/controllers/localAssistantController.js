const User = require("../models/user");
const SaleItem = require("../models/SaleItem");
const Group = require("../models/NeighbourhoodGroup");

const stopWords = new Set(["where","can","i","find","the","a","an","in","near","nearby","around","my","me","please","for","want","need","to","some","good","nice","best","recommend","recommendation","help","looking","place","places","get","is","are","that","with","who","do","you","any","cheap","affordable"]);
const hints = [
  { pattern: /\b(dinner|lunch|breakfast|restaurant|eat|food|dining|cafe|meal|date night)\b/i, terms: ["restaurant", "eatery", "food", "dining", "cafe", "catering", "chef"], text: "Food and dining" },
  { pattern: /\b(hair|salon|barber|braid|beauty)\b/i, terms: ["hair", "salon", "barber", "beauty", "braid"], text: "Hair and beauty" },
  { pattern: /\b(plumb|water leak|pipe)\b/i, terms: ["plumb", "pipe", "water"], text: "Plumbing" },
  { pattern: /\b(electric|power|wiring|socket)\b/i, terms: ["electric", "wiring", "power"], text: "Electrical work" },
  { pattern: /\b(clean|laundry|washing)\b/i, terms: ["clean", "laundry", "washing"], text: "Cleaning and laundry" },
  { pattern: /\b(phone|laptop|computer|television|tv|buy|sale|product)\b/i, terms: ["phone", "laptop", "computer", "tv", "electronics"], text: "Marketplace" },
];

const scrub = (value) => String(value || "").replace(/[^a-z0-9\s-]/gi, " ").trim();
const fold = (value) => String(value || "").trim().toLowerCase();
const equal = (left, right) => Boolean(left && right && fold(left) === fold(right));

async function ask(req, res) {
  try {
    const raw = typeof req.body.question === "string" ? req.body.question.trim() : "";
    if (raw.length < 3 || raw.length > 200) return res.status(400).json({ message: "Ask a question of 3–200 characters." });
    const viewer = await User.findById(req.user.id).select("city state");
    if (!viewer) return res.status(401).json({ message: "Please sign in again." });
    const hint = hints.find((item) => item.pattern.test(raw));
    const typed = scrub(raw).split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 6);
    const terms = [...new Set([...(hint?.terms || []), ...typed])].slice(0, 12);
    if (!terms.length) return res.status(400).json({ message: "Try a more specific request, such as 'dinner place', 'electrician' or 'office chair'." });
    const matches = new RegExp(terms.map((term) => term.replace(/[^a-z0-9]/gi, "")).filter(Boolean).join("|"), "i");
    const local = (item) => equal(item.city, viewer.city) || equal(item.state, viewer.state);
    const providerQuery = { role: "provider", $or: [{ category: matches }, { bio: matches }, { skills: matches }, { fullName: matches }] };
    const saleQuery = { status: "active", $or: [{ title: matches }, { description: matches }, { category: matches }, { subcategory: matches }] };
    const groupQuery = { isActive: true, $or: [{ name: matches }, { description: matches }, { category: matches }] };
    const [providers, listings, groups] = await Promise.all([
      User.find(providerQuery).select("fullName category bio city state isVerified rating reviewCount").limit(60).lean(),
      SaleItem.find(saleQuery).select("title price category imageUrl city state createdAt").limit(60).lean(),
      Group.find(groupQuery).select("name description category city state").limit(60).lean(),
    ]);
    function rank(items, kind) {
      return items.map((item) => ({ item, score: (equal(item.city, viewer.city) ? 6 : 0) + (equal(item.state, viewer.state) ? 3 : 0) + (item.isVerified ? 1 : 0) + (kind === "providers" && item.rating > 0 ? 0.5 : 0) }))
        .filter((row) => !viewer.state && !viewer.city || local(row.item))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ item }) => ({ type: kind, ...item }));
    }
    const results = [
      ...rank(providers, "providers"),
      ...rank(listings, "sale"),
      ...rank(groups, "groups"),
    ].slice(0, 8);
    const area = [viewer.city, viewer.state].filter(Boolean).join(", ") || "Nigeria";
    const suggestion = results.length
      ? "I found " + results.length + " matching item" + (results.length === 1 ? "" : "s") + " in VerifiedNG around " + area + ". These are listings, not independently checked recommendations."
      : "No matching VerifiedNG listings were found around " + area + ". Try another search term or check again as people add listings.";
    res.json({
      area, question: raw, topic: hint?.text || "Community search",
      answer: suggestion, results, source: "verifiedng_database",
      aiGenerated: false,
    });
  } catch (error) {
    console.error("Local assistant ask:", error);
    res.status(500).json({ message: "Could not search the community right now." });
  }
}

async function trending(req, res) {
  try {
    const [providers, sale] = await Promise.all([
      User.aggregate([
        { $match: { role: "provider", category: { $type: "string", $ne: "" } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
      SaleItem.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 6 },
      ]),
    ]);
    const ranked = [...providers, ...sale]
      .filter((entry) => typeof entry._id === "string" && entry._id.trim().length > 1 && entry._id.trim().length <= 80)
      .sort((a, b) => b.count - a.count);
    const terms = [...new Set(ranked.map((item) => item._id.trim()))].slice(0, 4);
    res.json({ terms, basis: "number_of_registered_provider_and_sale_listings" });
  } catch (error) {
    console.error("Trending local topics:", error);
    res.status(500).json({ message: "Could not load trending topics." });
  }
}

module.exports = { ask, trending };
