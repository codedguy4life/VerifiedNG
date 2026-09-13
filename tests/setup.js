const mongoose = require("mongoose");

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_TEST_URI, {
    family: 4,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
