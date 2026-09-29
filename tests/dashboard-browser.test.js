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

      <div
  id="dashboardError"
  style="display:none;"
>
  <h3>Unable to load your dashboard</h3>
  <p>Please check your connection and try again.</p>
  <button id="dashboardRetry">Try Again</button>
</div>

<div class="dashboard-wrapper"></div>
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

    window.history.pushState({}, "", "/dashboard.html");
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

  test("provider dashboard uses server role, loads own inbox, and can update a pending request", async () => {
    const providerUser = {
      id: "provider-789",
      fullName: "Test Provider",
      email: "provider@example.com",
      role: "customer",
      loginCount: 3,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("token", "provider-token");
    localStorage.setItem("user", JSON.stringify(providerUser));

    const hireRequest = {
      _id: "request-123",
      customer: {
        fullName: "Test Customer",
        phone: "08012345678",
      },
      service: "Electrical Installation",
      description: "Need electrical installation work",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    global.fetch = jest.fn().mockImplementation(async (url, options) => {
      if (url.endsWith("/api/user/profile")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            user: {
              id: "provider-789",
              fullName: "Test Provider",
              email: "provider@example.com",
              role: "provider",
              loginCount: 3,
              createdAt: new Date().toISOString(),
            },
          }),
        };
      }

      if (url.endsWith("/api/hire/provider")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            requests: [hireRequest],
          }),
        };
      }

      if (url.endsWith("/api/hire/request-123/status")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: "Request updated successfully",
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    window.eval(authScript);
    window.eval(dashboardScript);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById("userRole").textContent).toBe(
      "Service Provider",
    );

    expect(document.getElementById("providerInbox").style.display).toBe(
      "block",
    );

    expect(document.getElementById("sentRequestsCard").style.display).toBe(
      "none",
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/hire/provider",
      expect.objectContaining({
        headers: {
          authorization: "Bearer provider-token",
        },
      }),
    );

    const inbox = document.getElementById("hireRequestsList");

    expect(inbox.textContent).toContain("Need electrical installation work");
    expect(inbox.textContent).toContain("Pending");

    const buttons = Array.from(inbox.querySelectorAll("button"));
    const acceptButton = buttons.find(
      (button) => button.textContent.trim() === "Accept",
    );

    expect(acceptButton).toBeDefined();

    await acceptButton.click();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5000/api/hire/request-123/status",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer provider-token",
        },
        body: JSON.stringify({
          status: "accepted",
        }),
      }),
    );
  });

  test("signed-out users are redirected to login", async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    const redirect = jest.fn();

    window.eval(authScript);

    const result = await window.getVerifiedUser({ redirect });

    expect(result).toBeNull();
    expect(redirect).toHaveBeenCalledWith("login.html");
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

  test("dashboard shows a visible error when verification fails", async () => {
    localStorage.setItem("token", "valid-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "customer-500",
        fullName: "Test Customer",
        email: "test@example.com",
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

    window.eval(authScript);
    window.eval(dashboardScript);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const errorBox = document.getElementById("dashboardError");

    expect(errorBox.style.display).toBe("block");
    expect(errorBox.querySelector("p").textContent).toContain(
      "verify your account",
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
