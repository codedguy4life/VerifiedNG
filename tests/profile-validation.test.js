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

  test("rejects oversized category and bad pricing units", async () => {
    const category = await request(app).put("/api/user/profile")
      .set("Authorization", "Bearer " + token).send({ category: "a".repeat(81) });
    expect(category.statusCode).toBe(400);
    const unit = await request(app).put("/api/user/profile")
      .set("Authorization", "Bearer " + token).send({ per: "<script>" });
    expect(unit.statusCode).toBe(400);
  });

  test("an approved provider can edit real service details on their own public profile", async () => {
    await User.updateOne({ _id: user._id }, { $set: { role: "provider" } });
    const updated = await request(app).put("/api/user/profile")
      .set("Authorization", "Bearer " + token).send({
        category: "Electrical services",
        bio: "I install home wiring, repair lighting, and support solar installations.",
        skills: ["Wiring", "Solar systems"],
        experienceYears: 5,
        availability: "weekend",
        price: "From ₦5,000",
        per: "/job",
      });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.user.role).toBe("provider");
    const publicProfile = await request(app).get("/api/providers/" + user._id);
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.body.provider.category).toBe("Electrical services");
    expect(publicProfile.body.provider.skills).toEqual(["Wiring", "Solar systems"]);
    expect(publicProfile.body.provider.availability).toBe("weekend");
    expect(publicProfile.body.provider.experienceYears).toBe(5);
    expect(publicProfile.body.provider.email).toBeUndefined();
    expect(publicProfile.body.provider.phone).toBeUndefined();
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
