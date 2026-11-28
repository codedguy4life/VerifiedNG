const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const VerificationRequest = require("../src/models/VerificationRequest");
const Group = require("../src/models/NeighbourhoodGroup");
const GroupPost = require("../src/models/GroupPost");

describe("Verified groups, verification and Ask Area", () => {
  let admin;
  let member;
  let visitor;
  let adminToken;
  let memberToken;
  let visitorToken;
  let groupId;
  const users = [];
  const oldAdminIds = process.env.VERIFICATION_ADMIN_USER_IDS;
  let serial = 0;

  async function addUser(label) {
    serial += 1;
    const suffix = String(Date.now()) + String(serial) + String(Math.floor(Math.random() * 100000));
    const user = await User.create({
      fullName: label,
      email: "verify" + suffix + "@example.com",
      phone: "09" + suffix.slice(-9),
      password: await bcrypt.hash("TestPass123!", 10),
      state: "Lagos", city: "Ikeja",
      role: "customer",
    });
    users.push(user._id);
    return user;
  }
  async function login(user) {
    const result = await request(app).post("/api/auth/login").send({ identifier: user.email, password: "TestPass123!" });
    expect(result.statusCode).toBe(200);
    return "Bearer " + result.body.token;
  }
  async function approve(user, token) {
    const requestStatus = await request(app).post("/api/verification/requests")
      .set("Authorization", token)
      .send({ note: "I live around Ikeja and would like to join local community groups." });
    expect(requestStatus.statusCode).toBe(201);
    const reqDoc = await VerificationRequest.findOne({ user: user._id });
    expect(reqDoc.status).toBe("pending");
    const reviewed = await request(app).patch("/api/verification/admin/requests/" + reqDoc._id)
      .set("Authorization", adminToken).send({ decision: "approved" });
    expect(reviewed.statusCode).toBe(200);
  }

  beforeAll(async () => {
    admin = await addUser("Verification Administrator");
    member = await addUser("Verified Group Member");
    visitor = await addUser("Not Yet Verified");
    process.env.VERIFICATION_ADMIN_USER_IDS = String(admin._id);
    adminToken = await login(admin);
    memberToken = await login(member);
    visitorToken = await login(visitor);
  });
  afterAll(async () => {
    if (groupId) {
      await GroupPost.deleteMany({ group: groupId });
      await Group.deleteOne({ _id: groupId });
    }
    await VerificationRequest.deleteMany({ user: { $in: users } });
    await User.deleteMany({ _id: { $in: users } });
    if (oldAdminIds === undefined) delete process.env.VERIFICATION_ADMIN_USER_IDS;
    else process.env.VERIFICATION_ADMIN_USER_IDS = oldAdminIds;
  });

  test("unverified users can browse groups but cannot join or create", async () => {
    const browsed = await request(app).get("/api/groups").set("Authorization", memberToken);
    expect(browsed.statusCode).toBe(200);
    expect(Array.isArray(browsed.body.groups)).toBe(true);
    const blocked = await request(app).post("/api/groups").set("Authorization", memberToken)
      .send({ name: "Ikeja neighbours", description: "Chat", category: "Neighbourhood" });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.body.code).toBe("VERIFICATION_REQUIRED");
  });

  test("verification requires manual admin approval; cannot be self-approved", async () => {
    const status = await request(app).get("/api/verification/status").set("Authorization", memberToken);
    expect(status.body.verified).toBe(false);
    expect(status.body.canReview).toBe(false);
    const spoofed = await request(app).put("/api/user/profile")
      .set("Authorization", memberToken).send({ isVerified: true });
    expect(spoofed.statusCode).toBe(400);
    const afterSpoof = await User.findById(member._id);
    expect(afterSpoof.isVerified).toBe(false);
    const forbidden = await request(app).get("/api/verification/admin/pending").set("Authorization", memberToken);
    expect(forbidden.statusCode).toBe(403);
    await approve(member, memberToken);
    const after = await request(app).get("/api/verification/status").set("Authorization", memberToken);
    expect(after.body.verified).toBe(true);
  });

  test("a verified user can create groups and only verified members can read posts", async () => {
    const created = await request(app).post("/api/groups").set("Authorization", memberToken)
      .send({ name: "Ikeja residents group", description: "Neighbours sharing local tips", category: "Neighbourhood", requiresVerifiedMembers: true });
    expect(created.statusCode).toBe(201);
    groupId = created.body.group._id;
    const groupPage = await request(app).get("/api/groups/" + groupId).set("Authorization", visitorToken);
    expect(groupPage.statusCode).toBe(200);
    expect(groupPage.body.group.name).toBe("Ikeja residents group");
    const blockedJoin = await request(app).post("/api/groups/" + groupId + "/join")
      .set("Authorization", visitorToken).send({});
    expect(blockedJoin.statusCode).toBe(403);
    const blockedPosts = await request(app).get("/api/groups/" + groupId + "/posts")
      .set("Authorization", visitorToken);
    expect(blockedPosts.statusCode).toBe(403);

    const published = await request(app).post("/api/groups/" + groupId + "/posts")
      .set("Authorization", memberToken).send({ text: "Welcome to our group!" });
    expect(published.statusCode).toBe(201);
    await approve(visitor, visitorToken);
    const directReply = await request(app)
      .post("/api/groups/" + groupId + "/posts/" + published.body.post._id + "/comments")
      .set("Authorization", visitorToken)
      .send({ text: "Trying before joining" });
    expect(directReply.statusCode).toBe(403);
    const directReach = await request(app)
      .post("/api/groups/" + groupId + "/posts/" + published.body.post._id + "/reactions")
      .set("Authorization", visitorToken)
      .send({});
    expect(directReach.statusCode).toBe(403);
    const stillOutside = await request(app).get("/api/groups/" + groupId + "/posts")
      .set("Authorization", visitorToken);
    expect(stillOutside.statusCode).toBe(403);
    const joined = await request(app).post("/api/groups/" + groupId + "/join")
      .set("Authorization", visitorToken).send({});
    expect(joined.statusCode).toBe(200);
    const posts = await request(app).get("/api/groups/" + groupId + "/posts")
      .set("Authorization", visitorToken);
    expect(posts.statusCode).toBe(200);
    expect(posts.body.posts.map((p) => p.text)).toContain("Welcome to our group!");
    expect(posts.body.posts[0].reports).toBeUndefined();

    const commented = await request(app).post("/api/groups/" + groupId + "/posts/" + published.body.post._id + "/comments")
      .set("Authorization", visitorToken).send({ text: "Thanks for having us!" });
    expect(commented.statusCode).toBe(201);
  });

  test("verified creators can open groups to unverified members, while restricted groups stay protected", async () => {
    const newcomer = await addUser("Open Group Visitor");
    const newcomerToken = await login(newcomer);
    const restrictedJoin = await request(app).post("/api/groups/" + groupId + "/join")
      .set("Authorization", newcomerToken).send({});
    expect(restrictedJoin.statusCode).toBe(403);
    const forbiddenCreate = await request(app).post("/api/groups").set("Authorization", newcomerToken)
      .send({ name: "Unauthorized group", requiresVerifiedMembers: false });
    expect(forbiddenCreate.statusCode).toBe(403);
    const created = await request(app).post("/api/groups").set("Authorization", memberToken)
      .send({ name: "Open Ikeja neighbours", description: "Everyone can join", requiresVerifiedMembers: false });
    expect(created.statusCode).toBe(201);
    const id = created.body.group._id;
    try {
      const detail = await request(app).get("/api/groups/" + id).set("Authorization", newcomerToken);
      expect(detail.body.group.requiresVerifiedMembers).toBe(false);
      const joined = await request(app).post("/api/groups/" + id + "/join")
        .set("Authorization", newcomerToken).send({});
      expect(joined.statusCode).toBe(200);
      const published = await request(app).post("/api/groups/" + id + "/posts")
        .set("Authorization", newcomerToken).send({ text: "Hello from an unverified member" });
      expect(published.statusCode).toBe(201);
      const view = await request(app).get("/api/groups/" + id + "/posts")
        .set("Authorization", newcomerToken);
      expect(view.statusCode).toBe(200);
      expect(view.body.posts.some((p) => p.text === "Hello from an unverified member")).toBe(true);
    } finally {
      await GroupPost.deleteMany({ group: id });
      await Group.deleteOne({ _id: id });
    }
  });

  test("group creators can review reported posts; reporters stay private; outsiders cannot moderate", async () => {
    const post = await GroupPost.findOne({ group: groupId, text: "Welcome to our group!" });
    expect(post).toBeTruthy();
    const reported = await request(app)
      .post("/api/groups/" + groupId + "/posts/" + post._id + "/reports")
      .set("Authorization", visitorToken)
      .send({ reason: "spam", details: "This post needs review by the group owner." });
    expect(reported.statusCode).toBe(201);

    const outsiderQueue = await request(app).get("/api/groups/" + groupId + "/reports")
      .set("Authorization", visitorToken);
    expect(outsiderQueue.statusCode).toBe(403);
    const ownerQueue = await request(app).get("/api/groups/" + groupId + "/reports")
      .set("Authorization", memberToken);
    expect(ownerQueue.statusCode).toBe(200);
    const item = ownerQueue.body.reports.find((entry) => String(entry.postId) === String(post._id));
    expect(item).toBeDefined();
    expect(item.reasons.some((entry) => entry.reason === "spam")).toBe(true);
    expect(JSON.stringify(item)).not.toContain(String(visitor._id));

    const forbiddenRemove = await request(app).delete("/api/groups/" + groupId + "/posts/" + post._id)
      .set("Authorization", visitorToken);
    expect(forbiddenRemove.statusCode).toBe(403);
    const ownerRemove = await request(app).delete("/api/groups/" + groupId + "/posts/" + post._id)
      .set("Authorization", memberToken);
    expect(ownerRemove.statusCode).toBe(200);

    const posts = await request(app).get("/api/groups/" + groupId + "/posts")
      .set("Authorization", visitorToken);
    expect(posts.body.posts.some((entry) => String(entry._id) === String(post._id))).toBe(false);
    const cleared = await request(app).get("/api/groups/" + groupId + "/reports")
      .set("Authorization", memberToken);
    expect(cleared.body.reports.some((entry) => String(entry.postId) === String(post._id))).toBe(false);
  });

  test("verification rejection explains the decision and does not unlock Groups", async () => {
    const applicant = await addUser("Another verification applicant");
    const applicantToken = await login(applicant);
    const submitted = await request(app).post("/api/verification/requests")
      .set("Authorization", applicantToken)
      .send({ note: "I want to contribute to community groups in my city." });
    expect(submitted.statusCode).toBe(201);
    const record = await VerificationRequest.findOne({ user: applicant._id });

    const missingReason = await request(app)
      .patch("/api/verification/admin/requests/" + record._id)
      .set("Authorization", adminToken).send({ decision: "rejected" });
    expect(missingReason.statusCode).toBe(400);
    const rejected = await request(app)
      .patch("/api/verification/admin/requests/" + record._id)
      .set("Authorization", adminToken)
      .send({ decision: "rejected", reviewerNote: "Need more evidence of account ownership." });
    expect(rejected.statusCode).toBe(200);
    const checked = await request(app).get("/api/verification/status").set("Authorization", applicantToken);
    expect(checked.body.verified).toBe(false);
    expect(checked.body.request.status).toBe("rejected");
    expect(checked.body.request.reviewerNote).toContain("account ownership");
    const denied = await request(app).post("/api/groups/" + groupId + "/join")
      .set("Authorization", applicantToken).send({});
    expect(denied.statusCode).toBe(403);
    const tooSoon = await request(app).post("/api/verification/requests")
      .set("Authorization", applicantToken).send({ note: "I can supply more information." });
    expect(tooSoon.statusCode).toBe(429);
  });

  test("Ask Area returns only real matching providers and never fabricates a dinner place", async () => {
    const zero = await request(app).post("/api/discovery/ask")
      .set("Authorization", memberToken).send({ question: "zzzzzzzzz" });
    expect(zero.statusCode).toBe(200);
    expect(zero.body.results).toEqual([]);
    expect(zero.body.aiGenerated).toBe(false);

    const nearby = await addUser("Registered Local Restaurant");
    nearby.role = "provider";
    nearby.category = "Restaurant";
    await nearby.save();
    const dinner = await request(app).post("/api/discovery/ask")
      .set("Authorization", memberToken).send({ question: "Find a nice dinner place" });
    expect(dinner.statusCode).toBe(200);
    expect(dinner.body.results.some((item) => String(item._id) === String(nearby._id))).toBe(true);
    expect(dinner.body.source).toBe("verifiedng_database");
  });
});
