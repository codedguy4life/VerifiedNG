//. NAV SEARCH
function handleNavSearch() {
  const service = document.getElementById("navServiceInput").value.trim();
  if (service) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=Nigeria`;
  }
}

//. HERO SEARCH
function handleSearch() {
  const service = document.getElementById("serviceInput").value.trim();
  const location = document.getElementById("locationInput").value.trim();
  if (service || location) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`;
  }
}

// CHECK IF USER IS LOGGED IN
document.addEventListener("DOMContentLoaded", function () {
  const user = localStorage.getItem("user");

  if (user) {
    const userData = JSON.parse(user);

    // Get the nav-actions buttons
    const navActions = document.querySelector(".nav-actions");

    if (navActions) {
      // Replace both buttons with greeting and sign out
      navActions.innerHTML = `
  <a href="dashboard.html" class="btn-ghost" style="text-decoration:none">Hi, ${userData.fullName.split(" ")[0]} 👋</a>
  <button class="btn-primary" id="signOutBtn">Sign Out</button>
`;

      // Sign out button
      document.getElementById("signOutBtn").onclick = function () {
        signOut();
      };
    }
  }
});
