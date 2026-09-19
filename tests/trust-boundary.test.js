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

  // TTB-003: Provider inbox trust boundary

  test("provider can read their own inbox", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Inbox Customer",
      email: `inboxcustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `092${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const provider = await User.create({
      fullName: "Inbox Provider",
      email: `inboxprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `093${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "A request belonging to this provider.",
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/provider")
      .set("Authorization", `Bearer ${providerLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toHaveLength(1);
    expect(response.body.requests[0].providerId).toBe(provider._id.toString());

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(provider._id);
  });

  test("provider with no requests gets an empty inbox", async () => {
    const timestamp = Date.now();

    const provider = await User.create({
      fullName: "Empty Inbox Provider",
      email: `emptyinbox${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `097${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/provider")
      .set("Authorization", `Bearer ${providerLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toEqual([]);

    await User.findByIdAndDelete(provider._id);
  });

  test("provider cannot see another provider's requests", async () => {
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

    const requestForA = await HireRequest.create({
      providerName: providerA.fullName,
      providerId: providerA._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "A request belonging to Provider A.",
    });

    const providerBLogin = await request(app).post("/api/auth/login").send({
      identifier: providerB.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/provider")
      .set("Authorization", `Bearer ${providerBLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toEqual([]);

    await HireRequest.findByIdAndDelete(requestForA._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(providerA._id);
    await User.findByIdAndDelete(providerB._id);
  });

  test("altered browser identity cannot change the provider inbox", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Altered Identity Customer",
      email: `alteredcustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `099${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const providerA = await User.create({
      fullName: "Real Inbox Provider",
      email: `realprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `092${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const providerB = await User.create({
      fullName: "Other Provider",
      email: `otherprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `093${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: providerA.fullName,
      providerId: providerA._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "This request belongs to the real provider.",
    });

    const providerALogin = await request(app).post("/api/auth/login").send({
      identifier: providerA.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get(`/api/hire/provider?providerId=${providerB._id}`)
      .set("Authorization", `Bearer ${providerALogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toHaveLength(1);
    expect(response.body.requests[0].providerId).toBe(providerA._id.toString());

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(providerA._id);
    await User.findByIdAndDelete(providerB._id);
  });

  test("customer cannot read a provider inbox", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Inbox Customer",
      email: `customerinbox${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `098${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const customerLogin = await request(app).post("/api/auth/login").send({
      identifier: customer.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/provider")
      .set("Authorization", `Bearer ${customerLogin.body.token}`);

    expect(response.statusCode).toBe(403);

    await User.findByIdAndDelete(customer._id);
  });

  test("signed-out caller cannot read a provider inbox", async () => {
    const response = await request(app).get("/api/hire/provider");

    expect(response.statusCode).toBe(401);
  });

  // TTB-008: Accept/decline requests and customer sent requests

  test("provider can accept a pending hire request", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Accept Test Customer",
      email: `acceptcustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `080${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const provider = await User.create({
      fullName: "Accept Test Provider",
      email: `acceptprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `081${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "A pending request that the provider can accept.",
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .patch(`/api/hire/${hireRequest._id}/status`)
      .set("Authorization", `Bearer ${providerLogin.body.token}`)
      .send({ status: "accepted" });

    expect(response.statusCode).toBe(200);
    expect(response.body.request.status).toBe("accepted");

    const updatedRequest = await HireRequest.findById(hireRequest._id);
    expect(updatedRequest.status).toBe("accepted");

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(provider._id);
  });

  test("provider can decline a pending hire request", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Decline Test Customer",
      email: `declinecustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `082${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const provider = await User.create({
      fullName: "Decline Test Provider",
      email: `declineprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `083${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Plumbing repair",
      description: "A pending request that the provider can decline.",
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .patch(`/api/hire/${hireRequest._id}/status`)
      .set("Authorization", `Bearer ${providerLogin.body.token}`)
      .send({ status: "declined" });

    expect(response.statusCode).toBe(200);
    expect(response.body.request.status).toBe("declined");

    const updatedRequest = await HireRequest.findById(hireRequest._id);
    expect(updatedRequest.status).toBe("declined");

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(provider._id);
  });

  test("another provider cannot change a hire request they do not own", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Ownership Customer",
      email: `ownershipcustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `084${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const owner = await User.create({
      fullName: "Request Owner",
      email: `requestowner${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `085${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const outsider = await User.create({
      fullName: "Outsider Provider",
      email: `outsiderprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `086${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: owner.fullName,
      providerId: owner._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "This request belongs only to the request owner.",
    });

    const outsiderLogin = await request(app).post("/api/auth/login").send({
      identifier: outsider.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .patch(`/api/hire/${hireRequest._id}/status`)
      .set("Authorization", `Bearer ${outsiderLogin.body.token}`)
      .send({ status: "declined" });

    expect(response.statusCode).toBe(403);

    const unchangedRequest = await HireRequest.findById(hireRequest._id);
    expect(unchangedRequest.status).toBe("pending");

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(owner._id);
    await User.findByIdAndDelete(outsider._id);
  });

  test("customer can see only the hire requests they sent", async () => {
    const timestamp = Date.now();

    const customerA = await User.create({
      fullName: "Sent List Customer A",
      email: `sentcustomerA${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `087${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const customerB = await User.create({
      fullName: "Sent List Customer B",
      email: `sentcustomerB${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `088${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const provider = await User.create({
      fullName: "Sent List Provider",
      email: `sentprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `089${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const requestForA = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customerA._id.toString(),
      customerName: customerA.fullName,
      customerPhone: customerA.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "This request belongs to customer A.",
      status: "accepted",
    });

    const requestForB = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customerB._id.toString(),
      customerName: customerB.fullName,
      customerPhone: customerB.phone,
      serviceNeeded: "Plumbing repair",
      description: "This request belongs to customer B.",
    });

    const customerLogin = await request(app).post("/api/auth/login").send({
      identifier: customerA.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/sent")
      .set("Authorization", `Bearer ${customerLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toHaveLength(1);
    expect(response.body.requests[0]._id).toBe(requestForA._id.toString());
    expect(response.body.requests[0].status).toBe("accepted");

    await HireRequest.findByIdAndDelete(requestForA._id);
    await HireRequest.findByIdAndDelete(requestForB._id);
    await User.findByIdAndDelete(customerA._id);
    await User.findByIdAndDelete(customerB._id);
    await User.findByIdAndDelete(provider._id);
  });

  test("customer with no sent hire requests gets an empty list", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Empty Sent Customer",
      email: `emptysent${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `090${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const customerLogin = await request(app).post("/api/auth/login").send({
      identifier: customer.email,
      password: "TestPass123!",
    });

    const response = await request(app)
      .get("/api/hire/sent")
      .set("Authorization", `Bearer ${customerLogin.body.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.requests).toEqual([]);

    await User.findByIdAndDelete(customer._id);
  });

  test("malformed hire request id returns 404", async () => {
    const timestamp = Date.now();

    const provider = await User.create({
      fullName: `Malformed ID Provider ${timestamp}`,
      email: `malformed-provider-${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `091${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    expect(providerLogin.statusCode).toBe(200);
    expect(providerLogin.body.token).toBeDefined();

    const response = await request(app)
      .patch("/api/hire/not-an-object-id/status")
      .set("Authorization", `Bearer ${providerLogin.body.token}`)
      .send({ status: "accepted" });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Hire request not found");

    await User.findByIdAndDelete(provider._id);
  });

  test("concurrent accept and decline: only one wins", async () => {
    const timestamp = Date.now();

    const customer = await User.create({
      fullName: "Race Test Customer",
      email: `racecustomer${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `070${timestamp.toString().slice(-8)}`,
      role: "customer",
    });

    const provider = await User.create({
      fullName: "Race Test Provider",
      email: `raceprovider${timestamp}@example.com`,
      password: await bcrypt.hash("TestPass123!", 10),
      phone: `071${timestamp.toString().slice(-8)}`,
      role: "provider",
      isVerified: true,
    });

    const hireRequest = await HireRequest.create({
      providerName: provider.fullName,
      providerId: provider._id.toString(),
      customerId: customer._id.toString(),
      customerName: customer.fullName,
      customerPhone: customer.phone,
      serviceNeeded: "Electrical diagnostics",
      description: "A pending request for the concurrency test.",
    });

    const providerLogin = await request(app).post("/api/auth/login").send({
      identifier: provider.email,
      password: "TestPass123!",
    });

    expect(providerLogin.statusCode).toBe(200);
    expect(providerLogin.body.token).toBeDefined();

    const send = (status) =>
      request(app)
        .patch(`/api/hire/${hireRequest._id}/status`)
        .set("Authorization", `Bearer ${providerLogin.body.token}`)
        .send({ status });

    const [a, b] = await Promise.all([send("accepted"), send("declined")]);

    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 400]);

    const stored = await HireRequest.findById(hireRequest._id);
    expect(stored.status).toBe(a.statusCode === 200 ? "accepted" : "declined");

    await HireRequest.findByIdAndDelete(hireRequest._id);
    await User.findByIdAndDelete(customer._id);
    await User.findByIdAndDelete(provider._id);
  });
});
