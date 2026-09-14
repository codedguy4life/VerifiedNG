const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const frontendRoot = path.join(__dirname, "..");

app.use(
  cors({
    origin: [
      "https://codedguy4life.github.io",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Only expose frontend assets. Do not expose the whole repository.
app.use("/js", express.static(path.join(frontendRoot, "js")));
app.use("/styles", express.static(path.join(frontendRoot, "styles")));

const publicPages = new Set([
  "about.html",
  "all-providers-profile.html",
  "contact.html",
  "dashboard.html",
  "homepage2.html",
  "index.html",
  "login.html",
  "reset-password.html",
  "safety.html",
  "search.html",
  "signup-customer.html",
  "signup-provider.html",
  "upgrade-to-provider.html",
]);

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const providerRoutes = require("./routes/providerRoutes");
const hireRoutes = require("./routes/hireRoutes");

app.get("/api/health", (req, res) => {
  res.json({ message: "VerifiedNG Backend is running!" });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/hire", hireRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendRoot, "index.html"));
});

app.get("/:page", (req, res, next) => {
  const page = req.params.page;

  if (!publicPages.has(page)) {
    return next();
  }

  res.sendFile(path.join(frontendRoot, page));
});

const PORT = process.env.PORT || 5000;

const requiredEnvironment = ["MONGO_URI", "JWT_SECRET", "FRONTEND_URL"];

const getMissingEnvironmentVariables = () =>
  requiredEnvironment.filter((name) => {
    const value = process.env[name]?.trim();
    return !value || /^your[_-]/i.test(value);
  });

if (require.main === module) {
  const missingEnvironment = getMissingEnvironmentVariables();

  if (missingEnvironment.length > 0) {
    console.error(
      `Missing required environment variables: ${missingEnvironment.join(", ")}`,
    );
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => {
      console.error("MongoDB connection failed: " + err.message);
      process.exit(1);
    });

  app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
  });
}

module.exports = app;
