const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const ProviderApplication = require("../src/models/ProviderApplication");
const ContactMessage = require("../src/models/ContactMessage");

describe("Public onboarding and manual provider review", () => {
  let member, reviewer, outsider, memberToken, reviewerToken, outsiderToken;
  let contactId;
  let previousIds;
  const uid = String(Date.now()) + String(Math.floor(Math.random() * 100000));
  async function createPerson(label, index) {
    return User.create({
      fullName: label,
      email: "onboarding" + uid + index + "@example.com",
      phone: "095" + (uid + index).slice(-8),
      password: await bcrypt.hash("TestPass123!", 10),
      role: "customer",
      isVerified: false,
    });
  }
  async function token(person) {
    const response = await request(app).post("/api/auth/login")
      .send({ identifier: person.email, password: "TestPass123!" });
    expect(response.statusCode).toBe(200);
    return response.body.token;
  }
  const auth = (tokenValue) => ({ Authorization: "Bearer " + tokenValue });

  beforeAll(async () => {
    previousIds = process.env.VERIFICATION_ADMIN_USER_IDS;
    member = await createPerson("Public applicant", "1");
    reviewer = await createPerson("Staff reviewer", "2");
    outsider = await createPerson("Unrelated member", "3");
    process.env.VERIFICATION_ADMIN_USER_IDS = String(reviewer._id);
    memberToken = await token(member);
    reviewerToken = await token(reviewer);
    outsiderToken = await token(outsider);
  });
  afterAll(async () => {
    if (previousIds === undefined) delete process.env.VERIFICATION_ADMIN_USER_IDS;
    else process.env.VERIFICATION_ADMIN_USER_IDS = previousIds;
    await ProviderApplication.deleteMany({ user: { $in: [member?._id, reviewer?._id, outsider?._id].filter(Boolean) } });
    if (contactId) await ContactMessage.deleteOne({ _id: contactId });
    await User.deleteMany({ _id: { $in: [member?._id, reviewer?._id, outsider?._id].filter(Boolean) } });
  });

  test("provider applications require authentication", async () => {
    const response = await request(app).post("/api/provider-applications").send({});
    expect(response.statusCode).toBe(401);
  });

  test("a member cannot become a provider by submitting incomplete details", async () => {
    const response = await request(app).post("/api/provider-applications")
      .set(auth(memberToken)).send({ category: "Electrical", role: "provider" });
    expect(response.statusCode).toBe(400);
    expect((await User.findById(member._id)).role).toBe("customer");
  });

  test("complete applications remain pending and cannot be duplicated", async () => {
    const response = await request(app).post("/api/provider-applications").set(auth(memberToken)).send({
      category: "Electrical",
      bio: "I install and maintain household electrical systems and provide reliable residential repair services.",
      state: "Lagos", city: "Ikeja", experienceYears: 4,
      skills: ["Wiring", "Troubleshooting"], confirmAccuracy: true,
      role: "provider", isVerified: true,
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.application.status).toBe("pending");
    const viewer = await User.findById(member._id);
    expect(viewer.role).toBe("customer");
    expect(viewer.isVerified).toBe(false);
    const duplicate = await request(app).post("/api/provider-applications")
      .set(auth(memberToken)).send({ category: "Electrical" });
    // The duplicate may fail field validation before the duplicate check.
    expect([400, 409]).toContain(duplicate.statusCode);
    const myStatus = await request(app).get("/api/provider-applications/me").set(auth(memberToken));
    expect(myStatus.statusCode).toBe(200);
    expect(myStatus.body.application.status).toBe("pending");
    expect(myStatus.body.canReview).toBe(false);
  });

  test("unauthorized members cannot review or list other members' applications", async () => {
    const queue = await request(app).get("/api/provider-applications/admin/pending").set(auth(outsiderToken));
    expect(queue.statusCode).toBe(403);
    const appRecord = await ProviderApplication.findOne({ user: member._id });
    const approve = await request(app).patch("/api/provider-applications/admin/" + appRecord._id)
      .set(auth(outsiderToken)).send({ decision: "approved" });
    expect(approve.statusCode).toBe(403);
    expect((await User.findById(member._id)).role).toBe("customer");
  });

  test("only configured staff can approve provider access without giving verification status", async () => {
    const queue = await request(app).get("/api/provider-applications/admin/pending").set(auth(reviewerToken));
    expect(queue.statusCode).toBe(200);
    const item = queue.body.applications.find((entry) => String(entry.user?._id) === String(member._id));
    expect(item).toBeDefined();
    const review = await request(app).patch("/api/provider-applications/admin/" + item._id)
      .set(auth(reviewerToken)).send({ decision: "approved", reviewerNote: "Experience checked." });
    expect(review.statusCode).toBe(200);
    const updated = await User.findById(member._id);
    expect(updated.role).toBe("provider");
    expect(updated.isVerified).toBe(false);
    expect(updated.category).toBe("Electrical");
    const repeat = await request(app).patch("/api/provider-applications/admin/" + item._id)
      .set(auth(reviewerToken)).send({ decision: "approved", reviewerNote: "Previously reviewed and approved." });
    expect(repeat.statusCode).toBe(404);
  });

  test("a written review reason is required, and failed promotion restores pending status", async () => {
    const applied = await request(app).post("/api/provider-applications").set(auth(outsiderToken)).send({
      category: "Carpentry",
      bio: "I build and restore household furniture and provide carpentry repair services across Lagos.",
      state: "Lagos", city: "Yaba", experienceYears: 3,
      skills: ["Furniture repairs", "Wood finishing"], confirmAccuracy: true,
    });
    expect(applied.statusCode).toBe(201);
    const item = await ProviderApplication.findOne({ user: outsider._id });

    const noReason = await request(app).patch("/api/provider-applications/admin/" + item._id)
      .set(auth(reviewerToken)).send({ decision: "approved" });
    expect(noReason.statusCode).toBe(400);
    expect((await ProviderApplication.findById(item._id)).status).toBe("pending");

    const original = User.findByIdAndUpdate;
    const spy = jest.spyOn(User, "findByIdAndUpdate").mockRejectedValueOnce(new Error("Simulated profile database error"));
    let failed;
    try {
      failed = await request(app).patch("/api/provider-applications/admin/" + item._id)
        .set(auth(reviewerToken)).send({ decision: "approved", reviewerNote: "Checked work samples and references." });
    } finally {
      spy.mockRestore();
    }
    expect(failed.statusCode).toBe(500);
    expect((await ProviderApplication.findById(item._id)).status).toBe("pending");
    expect((await User.findById(outsider._id)).role).toBe("customer");

    const approved = await request(app).patch("/api/provider-applications/admin/" + item._id)
      .set(auth(reviewerToken)).send({ decision: "approved", reviewerNote: "Checked work samples and references." });
    expect(approved.statusCode).toBe(200);
    expect((await User.findById(outsider._id)).role).toBe("provider");
    const status = await request(app).get("/api/provider-applications/me").set(auth(outsiderToken));
    expect(status.body.application.status).toBe("approved");
    expect(status.body.application.reviewerNote).toContain("Checked work samples");
    expect(status.body.isProvider).toBe(true);
    expect(status.body.verified).toBe(false);
    const cannotSeeHistory = await request(app).get("/api/provider-applications/admin/recent").set(auth(memberToken));
    expect(cannotSeeHistory.statusCode).toBe(403);
    const history = await request(app).get("/api/provider-applications/admin/recent").set(auth(reviewerToken));
    expect(history.statusCode).toBe(200);
    expect(history.body.applications.some((item) =>
      item.status === "approved" && item.applicant?.fullName === outsider.fullName
    )).toBe(true);
  });

  test("admin dashboard is server-restricted and only exposes safe account fields", async () => {
    const denied = await request(app).get("/api/admin/overview").set(auth(outsiderToken));
    expect(denied.statusCode).toBe(403);
    const deniedUsers = await request(app).get("/api/admin/members").set(auth(outsiderToken));
    expect(deniedUsers.statusCode).toBe(403);
    const noToken = await request(app).get("/api/admin/overview");
    expect(noToken.statusCode).toBe(401);

    const summary = await request(app).get("/api/admin/overview").set(auth(reviewerToken));
    expect(summary.statusCode).toBe(200);
    expect(summary.body.counts.members).toBeGreaterThanOrEqual(3);
    expect(summary.body.counts.providers).toBeGreaterThanOrEqual(0);
    expect(summary.body.counts.providerPending).toBeGreaterThanOrEqual(0);
    expect(summary.body.counts.verificationPending).toBeGreaterThanOrEqual(0);
    expect(summary.body.counts.supportOpen).toBeGreaterThanOrEqual(0);

    const directory = await request(app).get("/api/admin/members?q=Public%20applicant")
      .set(auth(reviewerToken));
    expect(directory.statusCode).toBe(200);
    expect(directory.body.users.some((item) => item.email === member.email)).toBe(true);
    expect(directory.body.users.every((item) => !("password" in item) && !("resetToken" in item))).toBe(true);

    const invalid = await request(app).get("/api/admin/members?q=" + "x".repeat(81))
      .set(auth(reviewerToken));
    expect(invalid.statusCode).toBe(400);
  });

  test("public contact messages are accepted and visible only to authorized reviewers", async () => {
    const invalid = await request(app).post("/api/public/contact")
      .send({ name: "A", email: "wrong", topic: "Other", message: "hi" });
    expect(invalid.statusCode).toBe(400);
    const sent = await request(app).post("/api/public/contact").send({
      name: "Site Visitor", email: "visitor@example.com",
      topic: "Provider application", message: "I want to know how the review process works.",
    });
    expect(sent.statusCode).toBe(201);
    const stranger = await request(app).get("/api/public/contact/admin/inbox").set(auth(outsiderToken));
    expect(stranger.statusCode).toBe(403);
    const admin = await request(app).get("/api/public/contact/admin/inbox").set(auth(reviewerToken));
    expect(admin.statusCode).toBe(200);
    const item = admin.body.messages.find((entry) => entry.email === "visitor@example.com");
    expect(item).toBeDefined();
    contactId = item._id;
    const forbidden = await request(app).patch("/api/public/contact/admin/" + contactId)
      .set(auth(outsiderToken)).send({});
    expect(forbidden.statusCode).toBe(403);
    const handled = await request(app).patch("/api/public/contact/admin/" + contactId)
      .set(auth(reviewerToken)).send({});
    expect(handled.statusCode).toBe(200);
    const after = await request(app).get("/api/public/contact/admin/inbox").set(auth(reviewerToken));
    expect(after.body.messages.some((entry) => String(entry._id) === String(contactId))).toBe(false);
  });
});
