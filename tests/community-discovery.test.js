const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const CommunityPost = require("../src/models/CommunityPost");

describe("Community discovery and local news", () => {
  let viewer;
  let neighbour;
  let outsider;
  let provider;
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
    provider = await createMember("Test Electrician", "Ikeja", "Lagos");
    provider.role = "provider";
    provider.category = "Electrical";
    await provider.save();
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
    await User.deleteMany({ _id: { $in: [viewer?._id, neighbour?._id, outsider?._id, provider?._id].filter(Boolean) } });
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

  test("a guessed local-only post ID cannot be commented on, reacted to or reported from another area", async () => {
    const hiddenId = String(createdPosts[1]._id);
    const auth = { Authorization: "Bearer " + token };
    const [comment, reaction, report] = await Promise.all([
      request(app).post("/api/community/posts/" + hiddenId + "/comments").set(auth).send({ text: "Trying to read this" }),
      request(app).post("/api/community/posts/" + hiddenId + "/reactions").set(auth).send({}),
      request(app).post("/api/community/posts/" + hiddenId + "/reports").set(auth).send({ reason: "spam" }),
    ]);
    expect(comment.statusCode).toBe(404);
    expect(reaction.statusCode).toBe(404);
    expect(report.statusCode).toBe(404);
  });

  test("a user can save state and city before publishing a neighbourhood post", async () => {
    const member = await createMember("Location Onboarding", "", "");
    let postId;
    try {
      const login = await request(app).post("/api/auth/login").send({
        identifier: member.email,
        password: "TestPass123!",
      });
      expect(login.statusCode).toBe(200);
      const auth = { Authorization: "Bearer " + login.body.token };
      const before = await request(app).post("/api/community/posts").set(auth).send({
        text: "Before location",
        audience: "local",
      });
      expect(before.statusCode).toBe(400);
      const profile = await request(app).put("/api/user/profile").set(auth).send({
        state: "Lagos",
        city: "Ikeja",
      });
      expect(profile.statusCode).toBe(200);
      expect(profile.body.user.state).toBe("Lagos");
      const after = await request(app).post("/api/community/posts").set(auth).send({
        text: "After location",
        audience: "local",
      });
      expect(after.statusCode).toBe(201);
      expect(after.body.post.location.state).toBe("Lagos");
      postId = after.body.post._id;
    } finally {
      if (postId) await CommunityPost.deleteOne({ _id: postId });
      await User.deleteOne({ _id: member._id });
    }
  });

  test("provider search understands electrician as Electrical", async () => {
    const response = await request(app).get("/api/providers?search=electrician");
    expect(response.statusCode).toBe(200);
    expect(response.body.providers.map((provider) => String(provider._id))).toContain(String(provider._id));
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
