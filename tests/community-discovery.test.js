const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const CommunityPost = require("../src/models/CommunityPost");

describe("Community discovery and local news", () => {
  let viewer;
  let neighbour;
  let outsider;
  let token;
  let createdPosts = [];

  async function createMember(label, city, state) {
    const unique = String(Date.now()) + String(Math.floor(Math.random() * 1000000));
    return User.create({
      fullName: label,
      email: "discovery" + unique + "@example.com",
      phone: "095" + unique.slice(-8) + unique.slice(0, 2),
      password: await bcrypt.hash("TestPass123!", 10),
      role: "customer",
      city,
      state,
    });
  }

  beforeAll(async () => {
    viewer = await createMember("Viewer", "Ikeja", "Lagos");
    neighbour = await createMember("Neighbour", "Ikeja", "Lagos");
    outsider = await createMember("Outsider", "Ibadan", "Oyo");
    const login = await request(app).post("/api/auth/login").send({
      identifier: viewer.email,
      password: "TestPass123!",
    });
    expect(login.statusCode).toBe(200);
    token = login.body.token;

    createdPosts = await CommunityPost.create([
      { author: neighbour._id, text: "Neighbour bridge repair", audience: "local", location: { city: "Ikeja", state: "Lagos" }, category: "Safety Alert" },
      { author: outsider._id, text: "Private bridge report", audience: "local", location: { city: "Ibadan", state: "Oyo" }, category: "Safety Alert" },
      { author: outsider._id, text: "Public bridge update", audience: "national", location: { city: "Ibadan", state: "Oyo" }, category: "General" },
    ]);
  });

  afterAll(async () => {
    await CommunityPost.deleteMany({ _id: { $in: createdPosts.map((post) => post._id) } });
    await User.deleteMany({ _id: { $in: [viewer?._id, neighbour?._id, outsider?._id].filter(Boolean) } });
  });

  test("searching another city never exposes that city's local-only posts", async () => {
    const response = await request(app)
      .get("/api/community/search?q=bridge&area=Ibadan")
      .set("Authorization", "Bearer " + token);
    expect(response.statusCode).toBe(200);
    expect(response.body.posts.map((post) => post.text)).toContain("Public bridge update");
    expect(response.body.posts.map((post) => post.text)).not.toContain("Private bridge report");
    for (const post of response.body.posts) {
      expect(post.reports).toBeUndefined();
      expect(post.reactions).toBeUndefined();
    }
  });

  test("Near me feed cannot be tricked into showing another area's local-only posts", async () => {
    const response = await request(app)
      .get("/api/community/feed?scope=nearby&area=Ibadan")
      .set("Authorization", "Bearer " + token);
    expect(response.statusCode).toBe(200);
    expect(response.body.posts.map((post) => post.text)).not.toContain("Private bridge report");
  });

  test("a member can find safety alerts shared with their own area", async () => {
    const response = await request(app)
      .get("/api/community/search?area=Ikeja&category=Safety%20Alert")
      .set("Authorization", "Bearer " + token);
    expect(response.statusCode).toBe(200);
    expect(response.body.posts.map((post) => post.text)).toContain("Neighbour bridge repair");
    expect(response.body.posts.map((post) => post.text)).not.toContain("Private bridge report");
  });

  test("unconfigured publisher news returns an honest status instead of invented headlines", async () => {
    const original = process.env.GNEWS_API_KEY;
    delete process.env.GNEWS_API_KEY;
    try {
      const response = await request(app)
        .get("/api/local-news?mode=nigeria")
        .set("Authorization", "Bearer " + token);
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe("not_configured");
      expect(response.body.articles).toEqual([]);
    } finally {
      if (original === undefined) delete process.env.GNEWS_API_KEY;
      else process.env.GNEWS_API_KEY = original;
    }
  });
});
