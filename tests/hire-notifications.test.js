const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const HireRequest = require("../src/models/HireRequest");

describe("Private hire notifications", () => {
  let provider, customer, stranger, providerToken, customerToken, strangerToken;
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const auth = (token) => ({ Authorization: "Bearer " + token });

  beforeAll(async () => {
    const pwd = await bcrypt.hash("TestPass123!", 10);
    const accounts = [
      { fullName: "Service Provider", role: "provider", phone: "091" + String(unique).slice(-8) },
      { fullName: "Hire Customer", role: "customer", phone: "092" + String(unique).slice(-8) },
      { fullName: "Other Customer", role: "customer", phone: "093" + String(unique).slice(-8) },
    ];
    [provider, customer, stranger] = await Promise.all(accounts.map((user, i) =>
      User.create({ ...user, email: "hire-notify-" + i + "-" + unique + "@example.com", password: pwd })
    ));
    const logins = await Promise.all([provider, customer, stranger].map((user) =>
      request(app).post("/api/auth/login").send({ identifier: user.email, password: "TestPass123!" })
    ));
    [providerToken, customerToken, strangerToken] = logins.map((r) => r.body.token);
    expect(logins.every((r) => r.status === 200 && Boolean(r.body.token))).toBe(true);
  });

  afterAll(async () => {
    await HireRequest.deleteMany({ $or: [{ providerId: String(provider._id) }, { customerId: String(customer._id) }] });
    await User.deleteMany({ _id: { $in: [provider._id, customer._id, stranger._id] } });
  });

  test("new request notifies only its provider, not unrelated users or the customer", async () => {
    expect((await request(app).get("/api/notifications")).status).toBe(401);
    const sent = await request(app).post("/api/hire").set(auth(customerToken)).send({
      providerId: String(provider._id),
      serviceNeeded: "Electrical diagnostics",
      description: "Please help inspect an electrical fault at the flat.",
    });
    expect(sent.status).toBe(201);
    const count = await request(app).get("/api/notifications/unread-count").set(auth(providerToken));
    expect(count.body.unreadCount).toBe(1);
    const providerInbox = await request(app).get("/api/notifications").set(auth(providerToken));
    expect(providerInbox.status).toBe(200);
    expect(providerInbox.body.notifications[0].id).toBe(sent.body.request._id);
    expect(providerInbox.body.notifications[0].title).toMatch(/new hire request/i);
    expect(providerInbox.body.notifications[0].read).toBe(false);
    const raw = JSON.stringify(providerInbox.body);
    expect(raw).not.toContain(customer.phone);
    expect(raw).not.toContain(customer.email);
    expect(raw).not.toContain("Please help inspect");
    expect((await request(app).get("/api/notifications").set(auth(customerToken))).body.notifications).toHaveLength(0);
    expect((await request(app).get("/api/notifications").set(auth(strangerToken))).body.notifications).toHaveLength(0);
    const forbidden = await request(app).patch("/api/notifications/hire/" + sent.body.request._id + "/read").set(auth(strangerToken));
    expect(forbidden.status).toBe(404);
  });

  test("provider reading and accepting clears provider badge and notifies customer", async () => {
    const created = await HireRequest.findOne({ providerId: String(provider._id) });
    const marked = await request(app).patch("/api/notifications/hire/" + created._id + "/read").set(auth(providerToken));
    expect(marked.status).toBe(200);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(providerToken))).body.unreadCount).toBe(0);
    const accepted = await request(app).patch("/api/hire/" + created._id + "/status").set(auth(providerToken)).send({ status: "accepted" });
    expect(accepted.status).toBe(200);
    const customerInbox = await request(app).get("/api/notifications").set(auth(customerToken));
    expect(customerInbox.body.unreadCount).toBe(1);
    expect(customerInbox.body.notifications[0].title).toMatch(/accepted/i);
    expect(customerInbox.body.notifications[0].read).toBe(false);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(providerToken))).body.unreadCount).toBe(0);
    const forbidden = await request(app).patch("/api/notifications/hire/" + created._id + "/read").set(auth(strangerToken));
    expect(forbidden.status).toBe(404);
    const readAll = await request(app).patch("/api/notifications/read-all").set(auth(customerToken));
    expect(readAll.status).toBe(200);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(customerToken))).body.unreadCount).toBe(0);
    expect((await request(app).get("/api/notifications").set(auth(customerToken))).body.notifications[0].read).toBe(true);
  });

  test("declined requests notify customers, and only their own notification can be opened", async () => {
    const created = await request(app).post("/api/hire").set(auth(customerToken)).send({
      providerId: String(provider._id),
      serviceNeeded: "Air conditioning",
      description: "Could you help diagnose why the air conditioner is noisy?",
    });
    expect(created.status).toBe(201);
    const declined = await request(app).patch("/api/hire/" + created.body.request._id + "/status").set(auth(providerToken)).send({ status: "declined" });
    expect(declined.status).toBe(200);
    const notifications = await request(app).get("/api/notifications").set(auth(customerToken));
    const current = notifications.body.notifications.find((item) => item.id === created.body.request._id);
    expect(current.title).toMatch(/declined/i);
    expect(current.read).toBe(false);
    const otherUserRead = await request(app).patch("/api/notifications/hire/" + current.id + "/read").set(auth(strangerToken));
    expect(otherUserRead.status).toBe(404);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(customerToken))).body.unreadCount).toBe(1);
    const ownRead = await request(app).patch("/api/notifications/hire/" + current.id + "/read").set(auth(customerToken));
    expect(ownRead.status).toBe(200);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(customerToken))).body.unreadCount).toBe(0);
    expect((await request(app).get("/api/notifications/unread-count").set(auth(providerToken))).body.unreadCount).toBe(0);
    const invalid = await request(app).patch("/api/notifications/hire/not-an-id/read").set(auth(providerToken));
    expect(invalid.status).toBe(404);
  });
});
