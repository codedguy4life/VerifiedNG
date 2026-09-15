const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/index");
const User = require("../src/models/user");
const HireRequest = require("../src/models/HireRequest");

describe("Trust boundary", () => {
  test("local server serves the homepage but not repository source files", async () => {
    const homepage = await request(app).get("/");
    const packageFile = await request(app).get("/package.json");
    const sourceFile = await request(app).get("/src/index.js");

    expect(homepage.statusCode).toBe(200);
    expect(homepage.headers["content-type"]).toMatch(/html/);
    expect(packageFile.statusCode).toBe(404);
    expect(sourceFile.statusCode).toBe(404);
  });

  test("public provider endpoints never expose password-reset material", async () => {
    const timestamp = Date.now();
    const provider = await User.create({
      fullName: "Reset Token Provider",
      email: `resettokenprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `097${timestamp.toString().slice(-8)}`,
      role: "provider",
      category: "Electrical",
      resetToken: "stored-reset-token-hash",
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    });

    const listResponse = await request(app).get("/api/providers");
    expect(listResponse.statusCode).toBe(200);

    const listedProvider = listResponse.body.providers.find(
      (item) => item._id === provider._id.toString(),
    );

    expect(listedProvider).toBeDefined();
    expect(listedProvider.password).toBeUndefined();
    expect(listedProvider.resetToken).toBeUndefined();
    expect(listedProvider.resetTokenExpiry).toBeUndefined();

    const detailResponse = await request(app).get(
      `/api/providers/${provider._id}`,
    );

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.body.provider.password).toBeUndefined();
    expect(detailResponse.body.provider.resetToken).toBeUndefined();
    expect(detailResponse.body.provider.resetTokenExpiry).toBeUndefined();

    await User.findByIdAndDelete(provider._id);
  });

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

  test("tampered authentication proof cannot create a hire request", async () => {
    const timestamp = Date.now();

    const customer = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Tamper Test Customer",
        email: `tamper${timestamp}@example.com`,
        password: "TestPass123!",
        phone: `098${timestamp.toString().slice(-8)}`,
      });

    const provider = await User.create({
      fullName: "Tamper Test Provider",
      email: `tamperprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `099${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    // Take a real valid JWT and alter it.
    const validToken = customer.body.token;
    const tamperedToken =
      validToken.slice(0, -1) + (validToken.slice(-1) === "a" ? "b" : "a");

    const beforeCount = await HireRequest.countDocuments({
      customerId: customer.body.user.id.toString(),
    });

    const response = await request(app)
      .post("/api/hire")
      .set("Authorization", `Bearer ${tamperedToken}`)
      .send({
        providerId: provider._id.toString(),
        customerName: "Forged Customer",
        customerPhone: "08000000000",
        serviceNeeded: "Electrical diagnostics",
        description:
          "This request must be rejected because the token was changed.",
      });

    const afterCount = await HireRequest.countDocuments({
      customerId: customer.body.user.id.toString(),
    });

    expect(response.statusCode).toBe(401);
    expect(afterCount).toBe(beforeCount);

    await User.findByIdAndDelete(provider._id);
    await User.findByIdAndDelete(customer.body.user.id);
  });

  test("registration cannot self-assign the provider role", async () => {
    const email = `role${Date.now()}@example.com`;
    const phone = `088${Date.now().toString().slice(-8)}`;

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Role Test Customer",
      email,
      password: "TestPass123!",
      phone,
      role: "provider",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.role).toBe("customer");

    await User.findByIdAndDelete(response.body.user.id);
  });

  test("provider registration assigns provider role server-side", async () => {
    const response = await request(app)
      .post("/api/auth/register-provider")
      .send({
        fullName: "Provider Route User",
        email: `providerroute${Date.now()}@example.com`,
        password: "TestPass123!",
        phone: `087${Date.now().toString().slice(-8)}`,
        category: "Electrical",
        role: "customer",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.role).toBe("provider");

    await User.findByIdAndDelete(response.body.user.id);
  });

  test("customer cannot self-upgrade to provider", async () => {
    const email = `upgrade${Date.now()}@example.com`;
    const phone = `089${Date.now().toString().slice(-8)}`;

    const signup = await request(app).post("/api/auth/register").send({
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
    await User.findByIdAndDelete(signup.body.user.id);
  });

  test("invalid provider IDs return 404 instead of crashing the hire endpoint", async () => {
    const timestamp = Date.now();
    const customer = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Invalid Provider Customer",
        email: `invalidprovider${timestamp}@example.com`,
        password: "TestPass123!",
        phone: `086${timestamp.toString().slice(-8)}`,
      });

    const response = await request(app)
      .post("/api/hire")
      .set("Authorization", `Bearer ${customer.body.token}`)
      .send({
        providerId: "9",
        serviceNeeded: "Electrical diagnostics",
        description: "Trying a malformed provider id safely.",
      });

    expect(response.statusCode).toBe(404);
    await User.findByIdAndDelete(customer.body.user.id);
  });

  test("hire request identity comes from the authenticated user and stored text is not mutated", async () => {
    const timestamp = Date.now();
    const customerEmail = `hirecustomer${timestamp}@example.com`;
    const customerPhone = `090${timestamp.toString().slice(-8)}`;
    const providerEmail = `hireprovider${timestamp}@example.com`;
    const providerPhone = `091${timestamp.toString().slice(-8)}`;

    const customerSignup = await request(app).post("/api/auth/register").send({
      fullName: "Real Customer",
      email: customerEmail,
      password: "TestPass123!",
      phone: customerPhone,
    });

    const provider = await User.create({
      fullName: "Real Provider",
      email: providerEmail,
      password: await bcrypt.hash("TestPass123!", 10),
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
        description: "<img src=x onerror=alert(1)>",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.request.providerName).toBe("Real Provider");
    expect(response.body.request.customerName).toBe("Real Customer");
    expect(response.body.request.customerPhone).toBe(customerPhone);
    expect(response.body.request.customerId).toBe(
      customerSignup.body.user.id.toString(),
    );
    expect(response.body.request.description).toBe(
      "<img src=x onerror=alert(1)>",
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

  test("provider cannot read another provider's inbox", async () => {
    const timestamp = Date.now();
    const customer = await User.create({
      fullName: "Inbox Customer",
      email: `inboxcustomerpp${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `096${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const providerA = await User.create({
      fullName: "Provider A",
      email: `providera${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `094${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const providerB = await User.create({
      fullName: "Provider B",
      email: `providerb${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `095${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const ownedRequest = await HireRequest.create({
      providerName: providerA.fullName,
      providerId: providerA._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "A request belonging to Provider A.",
    });

    expect(ownedRequest.providerId).toBe(providerA._id.toString());

    const providerBLogin = await request(app).post("/api/auth/login").send({
      identifier: providerB.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get(`/api/hire/provider/${providerA._id}`)
      .set("Authorization", `Bearer ${providerBLogin.body.token}`);

    expect(response.statusCode).toBe(403);

    await HireRequest.findByIdAndDelete(ownedRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(providerA._id);
    await User.findByIdAndDelete(providerB._id);
  });
});
