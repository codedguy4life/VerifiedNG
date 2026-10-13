const request = require("supertest");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const app = require("../src/index");
const User = require("../src/models/user");

describe("Password reset session security", () => {
  test("password reset invalidates previously issued access tokens", async () => {
    const timestamp = Date.now();
    const password = "OldPass123!";
    const resetToken = "test-reset-token-that-is-long-enough";
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.create({
      fullName: "Password Reset Security Test",
      email: `passwordreset${timestamp}@example.com`,
      password: await bcrypt.hash(password, 10),
      phone: `096${timestamp.toString().slice(-8)}`,
      role: "customer",
      resetToken: resetTokenHash,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      const login = await request(app).post("/api/auth/login").send({
        identifier: user.email,
        password,
      });

      expect(login.statusCode).toBe(200);
      expect(login.body.token).toBeDefined();

      const reset = await request(app).post("/api/auth/reset-password").send({
        email: user.email,
        token: resetToken,
        newPassword: "NewPass123!",
      });

      expect(reset.statusCode).toBe(200);
      expect(reset.body.message).toBe(
        "Password reset successfully! You can now log in.",
      );

      const oldSession = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${login.body.token}`);

      expect(oldSession.statusCode).toBe(401);
      expect(oldSession.body.message).toMatch(/session has expired/i);

      const newLogin = await request(app).post("/api/auth/login").send({
        identifier: user.email,
        password: "NewPass123!",
      });

      expect(newLogin.statusCode).toBe(200);
      expect(newLogin.body.token).toBeDefined();

      const newSession = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${newLogin.body.token}`);

      expect(newSession.statusCode).toBe(200);
    } finally {
      await User.findByIdAndDelete(user._id);
    }
  });
});
