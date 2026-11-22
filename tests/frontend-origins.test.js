const request = require("supertest");
const app = require("../src/index");

describe("Allowed frontend origins", () => {
  test("Vercel production website can send credential-free JSON preflight for login", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://verified-ng-ten.vercel.app")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");
    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("https://verified-ng-ten.vercel.app");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  test("new custom domain is also allowed", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://verifiedng.site")
      .set("Access-Control-Request-Method", "POST");
    expect(response.headers["access-control-allow-origin"]).toBe("https://verifiedng.site");
  });

  test("unapproved websites do not receive a CORS allow-origin header", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://unapproved.example")
      .set("Access-Control-Request-Method", "POST");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
