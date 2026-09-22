/**
 * @jest-environment jsdom
 */

const fs = require("fs");
const path = require("path");

const authScript = fs.readFileSync(
  path.join(__dirname, "..", "js", "auth.js"),
  "utf8",
);

const dashboardScript = fs.readFileSync(
  path.join(__dirname, "..", "js", "dashboard.js"),
  "utf8",
);

describe("TTB-005 browser trust boundary", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="nav-actions"></div>

      <div id="firstName"></div>
      <div id="navGreeting"></div>
      <div id="userFullName"></div>
      <div id="userEmail"></div>
      <div id="userRole"></div>

      <div id="userAvatar"></div>

      <div id="loginCount"></div>
      <div id="memberDays"></div>
      <div id="lastLogin"></div>
      <div id="joinedDate"></div>
      <div id="lastLoginActivity"></div>
      <div id="totalLoginsText"></div>

      <div id="sentRequestsCard" style="display:none;">
        <div id="sentRequestsList"></div>
      </div>

      <div id="providerInbox" style="display:none;">
        <div id="hireRequestsList"></div>
      </div>
    `;

    localStorage.clear();

    window.API_URL = "http://localhost:5000";

    global.API_URL = window.API_URL;

    window.location.href = "dashboard.html";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test("server-driven role display ignores a tampered localStorage role", async () => {
    const storedUser = {
      id: "customer-123",
      fullName: "Test Customer",
      email: "customer@example.com",
      role: "provider",
      loginCount: 1,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify(storedUser));

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: "customer-123",
          fullName: "Test Customer",
          email: "customer@example.com",
          role: "customer",
          loginCount: 1,
          createdAt: new Date().toISOString(),
        },
      }),
    });

    window.eval(authScript);

    window.eval(dashboardScript);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("userRole").textContent).toBe("Customer");

    expect(document.getElementById("sentRequestsCard").style.display).toBe(
      "block",
    );

    expect(document.getElementById("providerInbox").style.display).toBe("none");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/user/profile",
      expect.objectContaining({
        headers: {
          authorization: "Bearer valid-token",
        },
      }),
    );
  });

  test("tampered localStorage cannot make a customer dashboard become a provider dashboard", async () => {
    const tamperedUser = {
      id: "customer-456",
      fullName: "Tampered Customer",
      email: "tampered@example.com",
      role: "provider",
      loginCount: 2,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("token", "valid-token");
    localStorage.setItem("user", JSON.stringify(tamperedUser));

    global.fetch = jest.fn().mockImplementation(async (url) => {
      if (url.endsWith("/api/user/profile")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: "customer-456",
              fullName: "Tampered Customer",
              email: "tampered@example.com",
              role: "customer",
              loginCount: 2,
              createdAt: new Date().toISOString(),
            },
          }),
        };
      }

      if (url.endsWith("/api/hire/sent")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            requests: [],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    window.eval(authScript);

    window.eval(dashboardScript);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const displayedRole = document.getElementById("userRole").textContent;

    expect(displayedRole).toBe("Customer");

    expect(document.getElementById("providerInbox").style.display).toBe("none");

    expect(document.getElementById("sentRequestsCard").style.display).toBe(
      "block",
    );
  });

  test("signed-out users are redirected to login", async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.eval(authScript);

    const result = await window.getVerifiedUser();

    expect(result).toBeNull();
  });

  test("401 from profile verification clears the session and redirects to login", async () => {
    localStorage.setItem("token", "expired-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "customer-401",
        fullName: "Expired Customer",
        email: "expired@example.com",
        role: "customer",
      }),
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: "Invalid or expired token",
      }),
    });

    window.eval(authScript);

    const result = await window.getVerifiedUser();

    expect(result).toBeNull();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  test("server error does not log the user out", async () => {
    localStorage.setItem("token", "valid-token");

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "customer-500",
        fullName: "Server Error Customer",
        email: "servererror@example.com",
        role: "customer",
      }),
    );

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        message: "Server error",
      }),
    });

    const onError = jest.fn();

    window.eval(authScript);

    const result = await window.getVerifiedUser({
      onError,
    });

    expect(result).toBeNull();

    expect(localStorage.getItem("token")).toBe("valid-token");
    expect(localStorage.getItem("user")).not.toBeNull();

    expect(onError).toHaveBeenCalledWith(
      "We couldn't verify your account right now. Please try again.",
    );
  });

  test("network failure does not log the user out", async () => {
    localStorage.setItem("token", "valid-token");

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "customer-network",
        fullName: "Network Customer",
        email: "network@example.com",
        role: "customer",
      }),
    );

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network connection failed"));

    const onError = jest.fn();

    window.eval(authScript);

    const result = await window.getVerifiedUser({
      onError,
    });

    expect(result).toBeNull();

    expect(localStorage.getItem("token")).toBe("valid-token");
    expect(localStorage.getItem("user")).not.toBeNull();

    expect(onError).toHaveBeenCalledWith(
      "Connection problem. Please check your internet and try again.",
    );
  });
});
