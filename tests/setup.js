jest.setTimeout(15000);
const mongoose = require("mongoose");

beforeAll(async () => {
  if (!process.env.MONGO_TEST_URI) {
    throw new Error(
      "MONGO_TEST_URI is missing. Copy .env.example to .env and set MONGO_TEST_URI to a dedicated test database.",
    );
  }

  await mongoose.connect(process.env.MONGO_TEST_URI, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
