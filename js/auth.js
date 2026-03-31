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

function goToProviderSignup() {
  const user = getCurrentUser();
  if (user) {
    // Already logged in — go to upgrade page
    window.location.href = "upgrade-to-provider.html";
  } else {
    // Not logged in — go to full signup
    window.location.href = "signup-provider.html";
  }
}
