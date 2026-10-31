const mongoose = require("mongoose");
const SaleItem = require("../models/SaleItem");
const { CATEGORIES } = require("../models/SaleItem");
const User = require("../models/user");

const escapeRegex = (text) => String(text).replace(/[^a-zA-Z0-9_\s-]/g, "\\$&");
const sorts = new Set(["relevant", "newest", "price_low", "price_high", "nearest"]);

function numberWithin(value, min, max) {
  const number = Number(value);
  return value !== "" && value !== null && value !== undefined &&
    Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function publicItem(item, viewerLocation) {
  const coords = item.approximatePoint?.coordinates;
  const calculated = viewerLocation && Array.isArray(coords) && coords.length === 2
    ? distanceKm(viewerLocation.lat, viewerLocation.lng, coords[1], coords[0])
    : null;
  const { approximatePoint, ...safe } = item;
  return {
    ...safe,
    distanceKm: typeof item.distanceMeters === "number"
      ? Math.round(item.distanceMeters / 100) / 10
      : calculated === null ? null : Math.round(calculated * 10) / 10,
    distanceMeters: undefined,
    relevance: undefined,
  };
}

async function listItems(req, res) {
  try {
    const q = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category : "";
    const subcategory = typeof req.query.subcategory === "string" ? req.query.subcategory : "";
    const sort = sorts.has(req.query.sort) ? req.query.sort : "relevant";
    const onlyFree = req.query.free === "true";
    if (q.length > 80) return res.status(400).json({ message: "Search must be 80 characters or fewer." });
    if (category && !CATEGORIES[category]) return res.status(400).json({ message: "Unknown category." });
    if (subcategory && (!category || !CATEGORIES[category]?.includes(subcategory)))
      return res.status(400).json({ message: "Choose a valid subcategory." });

    const radius = req.query.distanceKm === undefined ? null : numberWithin(req.query.distanceKm, 1, 250);
    if (req.query.distanceKm !== undefined && radius === null)
      return res.status(400).json({ message: "Choose a valid distance between 1 and 250 km." });
    const locRequested = req.query.lat !== undefined || req.query.lng !== undefined;
    const lat = locRequested ? numberWithin(req.query.lat, -90, 90) : null;
    const lng = locRequested ? numberWithin(req.query.lng, -180, 180) : null;
    if (locRequested && (lat === null || lng === null))
      return res.status(400).json({ message: "Location coordinates are invalid." });
    if ((radius !== null || sort === "nearest") && !locRequested)
      return res.status(400).json({ message: "Allow location to filter or sort by distance." });
    const viewerLocation = locRequested ? { lat, lng } : null;
    const page = Math.min(10000, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.min(24, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { status: "active" };
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (onlyFree) filter.price = 0;
    if (q) {
      const expression = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ title: expression }, { description: expression }, { category: expression }, { subcategory: expression }];
    }

    const geo = viewerLocation && (radius !== null || sort === "nearest");
    const pipeline = geo ? [{
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        spherical: true,
        query: filter,
        ...(radius !== null ? { maxDistance: radius * 1000 } : {}),
      },
    }] : [{ $match: filter }];
    if (q && sort === "relevant") {
      pipeline.push({ $addFields: {
        relevance: { $cond: [{ $regexMatch: { input: "$title", regex: escapeRegex(q), options: "i" } }, 1, 0] },
      } });
    }
    const ordering = {
      newest: { createdAt: -1 },
      price_low: { price: 1, createdAt: -1 },
      price_high: { price: -1, createdAt: -1 },
      nearest: { distanceMeters: 1 },
      relevant: q ? { relevance: -1, createdAt: -1 } : { createdAt: -1 },
    }[sort];
    pipeline.push({ $facet: {
      items: [
        { $sort: ordering },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { __v: 0 } },
      ],
      count: [{ $count: "total" }],
    } });
    const [result] = await SaleItem.aggregate(pipeline);
    const items = result?.items || [];
    await SaleItem.populate(items, { path: "seller", select: "fullName isVerified" });
    res.json({
      items: items.map((item) => publicItem(item, viewerLocation)),
      total: result?.count?.[0]?.total || 0,
      page,
      hasMore: page * limit < (result?.count?.[0]?.total || 0),
    });
  } catch (error) {
    console.error("Marketplace listItems:", error);
    res.status(500).json({ message: "Could not load marketplace listings." });
  }
}

async function createItem(req, res) {
  try {
    const owner = await User.findById(req.user.id).select("city state");
    if (!owner) return res.status(401).json({ message: "Please sign in again." });
    if (!owner.city && !owner.state)
      return res.status(400).json({ message: "Save your city or state in My profile before listing an item." });
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    const category = req.body.category;
    const subcategory = typeof req.body.subcategory === "string" ? req.body.subcategory : "";
    const price = numberWithin(req.body.price, 0, 1000000000);
    const imageUrl = typeof req.body.imageUrl === "string" ? req.body.imageUrl.trim() : "";
    if (title.length < 3 || title.length > 100 || description.length > 1000)
      return res.status(400).json({ message: "Add a title of 3–100 characters and a description under 1,000 characters." });
    if (!CATEGORIES[category] || (subcategory && !CATEGORIES[category].includes(subcategory)))
      return res.status(400).json({ message: "Choose a valid category and subcategory." });
    if (price === null || !Number.isInteger(price))
      return res.status(400).json({ message: "Enter a valid price in whole naira, or 0 for free." });
    if (imageUrl) {
      let valid = false;
      try {
        const url = new URL(imageUrl);
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        valid = url.protocol === "https:" && url.hostname === "res.cloudinary.com" &&
          url.pathname.startsWith("/" + (cloudName || url.pathname.split("/")[1]) + "/image/upload/");
      } catch { /* invalid URL */ }
      if (!valid) return res.status(400).json({ message: "Listing photos must be uploaded via Cloudinary." });
    }
    const hasLat = req.body.lat !== undefined;
    const hasLng = req.body.lng !== undefined;
    if (hasLat !== hasLng) return res.status(400).json({ message: "Both location coordinates are required." });
    const lat = hasLat ? numberWithin(req.body.lat, -90, 90) : null;
    const lng = hasLng ? numberWithin(req.body.lng, -180, 180) : null;
    if (hasLat && (lat === null || lng === null))
      return res.status(400).json({ message: "Approximate location coordinates are invalid." });
    const item = await SaleItem.create({
      seller: owner._id,
      title,
      description,
      category,
      subcategory,
      price,
      imageUrl,
      city: owner.city || "",
      state: owner.state || "",
      ...(hasLat ? { approximatePoint: { type: "Point", coordinates: [
        Math.round(lng * 100) / 100, Math.round(lat * 100) / 100,
      ] } } : {}),
    });
    await item.populate("seller", "fullName isVerified");
    res.status(201).json({ message: "Listing published.", item: publicItem(item.toObject(), null) });
  } catch (error) {
    console.error("Marketplace createItem:", error);
    res.status(500).json({ message: "Could not publish the listing." });
  }
}

async function changeItemStatus(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Listing not found." });
    if (!["active", "sold"].includes(req.body.status))
      return res.status(400).json({ message: "Choose a valid listing status." });
    const item = await SaleItem.findOneAndUpdate(
      { _id: req.params.id, seller: req.user.id },
      { status: req.body.status },
      { new: true },
    );
    if (!item) return res.status(404).json({ message: "Listing not found." });
    res.json({ message: "Listing updated.", item: publicItem(item.toObject(), null) });
  } catch (error) {
    console.error("Marketplace changeItemStatus:", error);
    res.status(500).json({ message: "Could not update listing." });
  }
}

module.exports = { listItems, createItem, changeItemStatus, CATEGORIES };
