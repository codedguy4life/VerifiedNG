const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const HireRequest = require("../src/models/HireRequest");

describe("Trust boundary", () => {
  test("signed-out caller cannot create a hire request", async () => {
    const response = await request(app).post("/api/hire").send({
      providerId: "507f1f77bcf86cd799439011",
      providerName: "Victim Provider",
      customerName: "Victim Customer",
      customerPhone: "08000000000",
      serviceNeeded: "Electrical diagnostics",
      description: "Trying to create a request without authentication.",
    });

    expect(response.statusCode).toBe(401);
  });

  test("customer cannot self-upgrade to provider", async () => {
    const email = `upgrade${Date.now()}@example.com`;
    const phone = `089${Date.now().toString().slice(-8)}`;

    const signup = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Upgrade Test Customer",
        email,
        password: "TestPass123!",
        phone,
        role: "customer",
      });

    const response = await request(app)
      .put("/api/user/upgrade-provider")
      .set("Authorization", `Bearer ${signup.body.token}`)
      .send({ category: "Electrical" });

    expect(response.statusCode).toBe(403);
  });

  test("hire request identity comes from the authenticated user", async () => {
    const timestamp = Date.now();
    const customerEmail = `hirecustomer${timestamp}@example.com`;
    const customerPhone = `090${timestamp.toString().slice(-8)}`;
    const providerEmail = `hireprovider${timestamp}@example.com`;
    const providerPhone = `091${timestamp.toString().slice(-8)}`;

    const customerSignup = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Real Customer",
        email: customerEmail,
        password: "TestPass123!",
        phone: customerPhone,
      });

    const password = await bcrypt.hash("TestPass123!", 10);
    const provider = await User.create({
      fullName: "Real Provider",
      email: providerEmail,
      password,
      phone: providerPhone,
      role: "provider",
      category: "Electrical",
      isVerified: true,
    });

    const response = await request(app)
      .post("/api/hire")
      .set("Authorization", `Bearer ${customerSignup.body.token}`)
      .send({
        providerId: provider._id.toString(),
        providerName: "Forged Provider Name",
        customerName: "Forged Customer Name",
        customerPhone: "09999999999",
        serviceNeeded: "Electrical diagnostics",
        description: "This request contains deliberately forged identity fields.",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.request.providerName).toBe("Real Provider");
    expect(response.body.request.customerName).toBe("Real Customer");
    expect(response.body.request.customerPhone).toBe(customerPhone);
    expect(response.body.request.customerId).toBe(
      customerSignup.body.user.id.toString(),
    );

    await HireRequest.findByIdAndDelete(response.body.request._id);
    await User.findByIdAndDelete(provider._id);
    await User.findByIdAndDelete(customerSignup.body.user.id);
  });

  test("customer cannot read a provider inbox", async () => {
    const timestamp = Date.now();
    const customer = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Inbox Customer",
        email: `inboxcustomer${timestamp}@example.com`,
        password: "TestPass123!",
        phone: `092${timestamp.toString().slice(-8)}`,
      });

    const provider = await User.create({
      fullName: "Inbox Provider",
      email: `inboxprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `093${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const response = await request(app)
      .get(`/api/hire/provider/${provider._id}`)
      .set("Authorization", `Bearer ${customer.body.token}`);

    expect(response.statusCode).toBe(403);

    await User.findByIdAndDelete(provider._id);
    await User.findByIdAndDelete(customer.body.user.id);
  });
});
