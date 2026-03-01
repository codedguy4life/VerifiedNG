const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ADD THIS LINE ↓ — import your routes
const authRoutes = require("./routes/authRoutes");

app.get("/", (req, res) => {
  res.json({ message: "🇳🇬 VerifiedNG Backend is running!" });
});

app.get("/api/status", (req, res) => {
  res.json({
    server: "running",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ADD THIS LINE ↓ — tell app to USE the routes
app.use("/api/auth", authRoutes);

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
