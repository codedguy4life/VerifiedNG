const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "🇳🇬 VerifiedNG Backend is running!" });
});

const PORT = process.env.PORT || 5000;

// Start server first — don't wait for MongoDB
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Try MongoDB separately
mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("⚠️ MongoDB offline:", err.message));
