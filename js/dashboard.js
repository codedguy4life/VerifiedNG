// PROTECTED — redirects to login if not logged in
const user = checkAuth();

if (user) {
  // Fill in all user details
  document.getElementById("firstName").textContent =
    user.fullName.split(" ")[0];

  document.getElementById("navGreeting").textContent =
    "Hi, " + user.fullName.split(" ")[0];

  document.getElementById("userFullName").textContent = user.fullName;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userRole").textContent =
    user.role === "customer" ? "Customer" : "Service Provider";

  // Calculate days as member (from when token was created)
  document.getElementById("memberDays").textContent = "1";
}
// UPDATE NAV BASED ON LOGIN STATE
document.addEventListener("DOMContentLoaded", function () {
  const user = getCurrentUser();
  const navActions = document.querySelector(".nav-actions");

  if (navActions && user) {
    navActions.innerHTML = `
      <a href="dashboard.html" class="btn-ghost" 
        style="text-decoration:none">
        Hi, ${user.fullName.split(" ")[0]} 👋
      </a>
      <button class="btn-ghost" onclick="signOut()">Sign Out</button>
    `;
  }
});
// Show initials avatar
const initialsEl = document.getElementById("userAvatar");
if (initialsEl && user.fullName) {
  const parts = user.fullName.split(" ");
  const initials = parts[0][0] + (parts[1] ? parts[1][0] : "");
  initialsEl.textContent = initials.toUpperCase();
}
