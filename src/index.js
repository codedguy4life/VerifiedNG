const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

app.get("/", (req, res) => {
  res.json({ message: "🇳🇬 VerifiedNG Backend is running!" });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("⚠️ MongoDB offline:", err.message)
  });
```

---

> 💡 Notice `app.listen` is now INSIDE `.then()` — meaning server only starts AFTER MongoDB connects successfully. When you go ashore, both lines will show together:
```
✅ MongoDB connected
🚀 Server running on port 5000