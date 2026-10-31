const mongoose = require("mongoose");

const CATEGORIES = Object.freeze({
  Electronics: ["Phones & tablets", "Computers", "TV & audio", "Accessories", "Other electronics"],
  "Home & Furniture": ["Furniture", "Appliances", "Home decor", "Kitchen", "Other home"],
  Fashion: ["Clothing", "Shoes", "Bags", "Jewellery", "Other fashion"],
  Vehicles: ["Cars", "Motorcycles", "Vehicle parts", "Other vehicles"],
  "Beauty & Health": ["Beauty", "Personal care", "Fitness", "Other beauty"],
  "Sports & Outdoors": ["Sports equipment", "Bicycles", "Outdoor gear"],
  "Kids & Baby": ["Toys", "Baby gear", "Kids clothing"],
  "Books & Learning": ["Books", "School supplies", "Instruments"],
  Other: ["General"],
});

const saleItemSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  category: { type: String, required: true, enum: Object.keys(CATEGORIES) },
  subcategory: { type: String, trim: true, maxlength: 60, default: "" },
  price: { type: Number, required: true, min: 0, max: 1000000000 },
  imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
  city: { type: String, trim: true, maxlength: 80, default: "" },
  state: { type: String, trim: true, maxlength: 80, default: "" },
  // Approximate (~1 km) seller-selected location only. No exact home addresses.
  approximatePoint: {
    type: { type: String, enum: ["Point"], default: undefined },
    coordinates: { type: [Number], default: undefined },
  },
  status: { type: String, enum: ["active", "sold"], default: "active", index: true },
}, { timestamps: true });

saleItemSchema.index({ status: 1, createdAt: -1 });
saleItemSchema.index({ status: 1, category: 1, createdAt: -1 });
saleItemSchema.index({ approximatePoint: "2dsphere" }, { sparse: true });

module.exports = mongoose.model("SaleItem", saleItemSchema);
module.exports.CATEGORIES = CATEGORIES;
