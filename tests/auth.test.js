const request = require("supertest");
const app = require("../src/index");

describe("Authentication", () => {
  test("backend is running", async () => {
    const response = await request(app).get("/api/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("VerifiedNG Backend is running!");
  });

  test("customer can sign up successfully", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Jest Test Customer",
        email: `jestcustomer${Date.now()}@example.com`,
        password: "TestPass123!",
        phone: `080${Date.now().toString().slice(-8)}`,
        role: "customer",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe("Account created successfully!");
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.role).toBe("customer");
  });

  test("client cannot self-assert provider role during signup", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Jest Test Provider Applicant",
        email: `jestprovider${Date.now()}@example.com`,
        password: "TestPass123!",
        phone: `081${Date.now().toString().slice(-8)}`,
        role: "provider",
        category: "Electrical",
        bio: "Professional electrical service provider with experience.",
        skills: ["Wiring", "Installation"],
        state: "Lagos",
        city: "Ikeja",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.role).toBe("customer");
  });

  test("user can sign in with email", async () => {
    const email = `jestlogin${Date.now()}@example.com`;
    const password = "TestPass123!";

    await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Jest Login User",
        email,
        password,
        phone: `082${Date.now().toString().slice(-8)}`,
        role: "customer",
      });

    const response = await request(app).post("/api/auth/login").send({
      identifier: email,
      password,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Login successful!");
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
  });

  test("user can sign in with phone number", async () => {
    const email = `jestphone${Date.now()}@example.com`;
    const password = "TestPass123!";
    const phone = `083${Date.now().toString().slice(-8)}`;

    await request(app).post("/api/auth/register").send({
      fullName: "Jest Phone User",
      email,
      password,
      phone,
      role: "customer",
    });

    const response = await request(app).post("/api/auth/login").send({
      identifier: phone,
      password,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Login successful!");
    expect(response.body.token).toBeDefined();
    expect(response.body.user).toBeDefined();
    expect(response.body.user.phone).toBe(phone);
  });

  test("wrong password fails with the correct error", async () => {
    const email = `jestwrongpass${Date.now()}@example.com`;
    const password = "CorrectPass123!";

    await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Jest Wrong Password User",
        email,
        password,
        phone: `084${Date.now().toString().slice(-8)}`,
        role: "customer",
      });

    const response = await request(app).post("/api/auth/login").send({
      identifier: email,
      password: "WrongPassword123!",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Invalid email/phone or password");
    expect(response.body.token).toBeUndefined();
    expect(response.body.user).toBeUndefined();
  });

  test("duplicate email signup fails with the correct error", async () => {
    const email = `jestduplicateemail${Date.now()}@example.com`;

    await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "First Email User",
        email,
        password: "TestPass123!",
        phone: `085${Date.now().toString().slice(-8)}`,
        role: "customer",
      });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Second Email User",
        email,
        password: "TestPass456!",
        phone: `086${Date.now().toString().slice(-8)}`,
        role: "customer",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("That email is already in use");
  });

  test("duplicate phone signup fails with the correct error", async () => {
    const phone = `087${Date.now().toString().slice(-8)}`;

    await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "First Phone User",
        email: `firstphone${Date.now()}@example.com`,
        password: "TestPass123!",
        phone,
        role: "customer",
      });

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        fullName: "Second Phone User",
        email: `secondphone${Date.now()}@example.com`,
        password: "TestPass456!",
        phone,
        role: "customer",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("That phone number is already in use");
  });
});
