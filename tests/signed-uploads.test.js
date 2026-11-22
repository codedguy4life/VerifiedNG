const crypto = require("node:crypto");
const request = require("supertest");
const app = require("../src/index");
const User = require("../src/models/user");

describe("Signed Cloudinary upload authorization", () => {
  const original = {};
  const names = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "CLOUDINARY_UPLOAD_PRESET"];
  let userId;
  let token;
  beforeAll(async () => {
    for (const name of names) original[name] = process.env[name];
    const id = Date.now();
    const result = await request(app).post("/api/auth/register").send({
      fullName: "Upload Security Test",
      email: "cloudinary-upload-" + id + "@example.com",
      phone: "091" + String(id).slice(-8),
      password: "TestPass123!",
    });
    expect(result.status).toBe(201);
    token = result.body.token;
    userId = result.body.user.id;
  });
  afterAll(async () => {
    await User.findByIdAndDelete(userId);
    for (const name of names) {
      if (original[name] === undefined) delete process.env[name];
      else process.env[name] = original[name];
    }
  });

  test("anonymous browsers cannot get a signature", async () => {
    const result = await request(app).post("/api/uploads/sign").send({ resourceType: "image" });
    expect(result.status).toBe(401);
  });

  test("missing backend credentials returns a safe error", async () => {
    for (const name of names) delete process.env[name];
    const result = await request(app).post("/api/uploads/sign")
      .set("Authorization", "Bearer " + token).send({ resourceType: "image" });
    expect(result.status).toBe(503);
    expect(result.body).not.toHaveProperty("apiSecret");
  });

  test("server signs only fixed preset and timestamp; never returns secret", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "verifiedng-test-cloud";
    process.env.CLOUDINARY_API_KEY = "public-test-key";
    process.env.CLOUDINARY_API_SECRET = "backend-only-test-secret";
    process.env.CLOUDINARY_UPLOAD_PRESET = "verifiedng_community";
    const result = await request(app).post("/api/uploads/sign")
      .set("Authorization", "Bearer " + token).send({ resourceType: "image" });
    expect(result.status).toBe(200);
    const data = result.body;
    expect(data.cloudName).toBe("verifiedng-test-cloud");
    expect(data.apiKey).toBe("public-test-key");
    expect(data.uploadPreset).toBe("verifiedng_community");
    expect(data.resourceType).toBe("image");
    expect(data).not.toHaveProperty("apiSecret");
    expect(JSON.stringify(data)).not.toContain("backend-only-test-secret");
    const check = crypto.createHash("sha1").update(
      "timestamp=" + data.timestamp + "&upload_preset=verifiedng_communitybackend-only-test-secret",
    ).digest("hex");
    expect(data.signature).toBe(check);
    expect(Math.abs(data.timestamp - Math.floor(Date.now() / 1000))).toBeLessThan(10);
  });

  test("only image and video resource types are signed", async () => {
    const result = await request(app).post("/api/uploads/sign")
      .set("Authorization", "Bearer " + token).send({ resourceType: "raw" });
    expect(result.status).toBe(400);
  });
});
