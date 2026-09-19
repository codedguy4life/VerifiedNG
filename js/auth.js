// AUTH GUARD — protects pages from non-logged-in users

function checkAuth() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) {
    // Not logged in — redirect to login
    window.location.href = "login.html";
    return null;
  }

  // Logged in — return user data
  return JSON.parse(user);
}

async function getVerifiedUser() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/user/profile`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
      return null;
    }

    const data = await response.json();

    return data.user;
  } catch (error) {
    console.error("Could not verify user:", error);
    return null;
  }
}

// Get current user without redirecting
function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Sign out from anywhere
function signOut() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Use this function on every "Become a Provider" button sitewide
async function goToProviderSignup() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "signup-provider.html";
    return;
  }

  const user = await getVerifiedUser();

  if (!user) return;

  if (user.role === "provider") {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "upgrade-to-provider.html";
  }
}

// Call this on every page to update nav based on login state
function updateNavForLoginState() {
  const user = getCurrentUser();
  const navActions = document.querySelector(".nav-actions");
  if (!navActions) return;

  // Skip on dashboard — it handles its own nav
  if (window.location.pathname.includes("dashboard")) return;

  if (user) {
    navActions.innerHTML = `
      <a href="dashboard.html" class="btn-ghost" style="text-decoration:none;">
        Hi, ${user.fullName.split(" ")[0]} <i class="bi bi-person-circle"></i>
      </a>
      <button class="btn-ghost" onclick="signOut()">Sign Out</button>
    `;
  }
}

// Auto-run on every page that loads auth.js
document.addEventListener("DOMContentLoaded", updateNavForLoginState);
