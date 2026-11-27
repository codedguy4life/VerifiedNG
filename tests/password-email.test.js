const request = require("supertest");
const app = require("../src/index");
const User = require("../src/models/user");

describe("Password recovery email delivery", () => {
  let savedKey;
  let savedSender;
  let savedFetch;
  const users = [];
  beforeAll(() => {
    savedKey = process.env.RESEND_API_KEY;
    savedSender = process.env.RESEND_FROM_EMAIL;
    savedFetch = global.fetch;
  });
  afterAll(async () => {
    await User.deleteMany({ _id: { $in: users } });
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
    if (savedSender === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = savedSender;
    global.fetch = savedFetch;
  });

  test("missing mail configuration fails promptly, even for unknown addresses", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    const response = await request(app).post("/api/auth/forgot-password")
      .send({ email: "unknown-" + Date.now() + "@example.com" });
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/temporarily unavailable/i);
  });

  test("reset email uses HTTPS API, contains verifiedng.site link, and DB stores only token hash", async () => {
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.RESEND_FROM_EMAIL = "VerifiedNG <no-reply@verifiedng.site>";
    const stamp = Date.now();
    const user = await User.create({
      fullName: "Email Test User", email: "email-test-" + stamp + "@example.com",
      phone: "093" + String(stamp).slice(-8), password: "not-a-real-password",
    });
    users.push(user._id);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const response = await request(app).post("/api/auth/forgot-password")
      .send({ email: user.email });
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers.Authorization).toBe("Bearer resend-test-key");
    const emailBody = JSON.parse(options.body);
    expect(emailBody.to).toEqual([user.email]);
    expect(emailBody.html).toContain("https://verifiedng.site/reset-password?reset_token=");
    const stored = await User.findById(user._id);
    expect(stored.resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(emailBody.html).not.toContain(stored.resetToken);
    expect(stored.resetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  test("email provider failures return promptly and do not leave a valid reset token", async () => {
    const stamp = Date.now();
    const user = await User.create({
      fullName: "Email Provider Failure", email: "email-fail-" + stamp + "@example.com",
      phone: "092" + String(stamp).slice(-8), password: "not-a-real-password",
    });
    users.push(user._id);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    const response = await request(app).post("/api/auth/forgot-password")
      .send({ email: user.email });
    expect(response.status).toBe(503);
    const stored = await User.findById(user._id);
    expect(stored.resetToken).toBeNull();
  });
});
