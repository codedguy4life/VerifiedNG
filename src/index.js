const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

app.get("/", (req, res) => {
  res.json({ message: "VerifiedNG Backend is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

mongoose
  .connect(process.env.MONGO_URI, { family: 4 })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB offline: " + err.message));
