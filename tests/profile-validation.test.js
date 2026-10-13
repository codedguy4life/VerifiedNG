const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");

describe("Profile update validation", () => {
  let user;
  let token;

  beforeEach(async () => {
    const timestamp = Date.now();
    user = await User.create({
      fullName: "Profile Validation User",
      email: `profilevalidation${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `095${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const login = await request(app).post("/api/auth/login").send({
      identifier: user.email,
      password: "TestPass123!",
    });
    token = login.body.token;
  });

  afterEach(async () => {
    if (user?._id) await User.findByIdAndDelete(user._id);
  });

  test("rejects invalid experience years with a clear client error", async () => {
    const response = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ experienceYears: -2 });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/between 0 and 80/i);
  });

  test("rejects skills that are not an array of text", async () => {
    const response = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ skills: "plumbing" });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/skills must be a list/i);
  });

  test("does not allow profile updates to change the account role", async () => {
    const response = await request(app)
      .put("/api/user/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Updated Name", role: "provider" });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.role).toBe("customer");

    const storedUser = await User.findById(user._id);
    expect(storedUser.role).toBe("customer");
    expect(storedUser.fullName).toBe("Updated Name");
  });
});
