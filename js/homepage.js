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

// Load real category counts from database
function loadCategoryCounts() {
  fetch(`${API_URL}/api/providers/counts`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.counts) return;

      const counts = data.counts;

      // Map category names to their card elements
      const categoryMap = {
        Electrical: "countElectrical",
        Plumbing: "countPlumbing",
        Tutoring: "countTutoring",
        "Auto Mechanic": "countMechanic",
        Cleaning: "countCleaning",
        Photography: "countPhotography",
        ContentCreator: "countPhotography",
        Tailoring: "countTailoring",
        Catering: "countCatering",
      };

      Object.keys(categoryMap).forEach((cat) => {
        const el = document.getElementById(categoryMap[cat]);
        if (el && counts[cat]) {
          el.textContent = counts[cat] + " providers";
        }
      });
    })
    .catch((err) => console.log("Could not load counts:", err));
}

document.addEventListener("DOMContentLoaded", function () {
  loadCategoryCounts();
});

// CHECK IF USER IS LOGGED IN
document.addEventListener("DOMContentLoaded", function () {
  const user = localStorage.getItem("user");

  if (user) {
    const userData = JSON.parse(user);
    const navActions = document.querySelector(".nav-actions");

    if (navActions) {
      navActions.innerHTML = `
        <a href="dashboard.html" class="btn-ghost" style="text-decoration:none">
          Hi, ${userData.fullName.split(" ")[0]} <i class="bi bi-person-circle"></i>
        </a>
        <button class="btn-ghost" onclick="signOut()">Sign Out</button>
      `;
    }

    // Show "become a provider" banner for customers only
    if (userData.role === "customer") {
      const banner = document.createElement("div");
      banner.style.cssText = `
        background: #1a1a2e; color: white; text-align: center;
        padding: 12px 20px; font-family: DM Sans, sans-serif;
        font-size: 0.9rem; position: relative;
      `;
      banner.innerHTML = `
        <i class="bi bi-tools"></i> Are you a skilled provider? 
        <a href="upgrade-to-provider.html" 
          style="color:#00c853;font-weight:600;margin-left:8px;text-decoration:none;">
          Set up your provider profile →
        </a>
      `;
      document.body.insertBefore(banner, document.body.firstChild);

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
      // Sign out button
      document.getElementById("signOutBtn").onclick = function () {
        signOut();
      };
    }
  }
});

// Enter key triggers search
document.addEventListener("DOMContentLoaded", function () {
  const navInput = document.getElementById("navServiceInput");
  const heroServiceInput = document.getElementById("serviceInput");
  const heroLocationInput = document.getElementById("locationInput");

  if (navInput) {
    navInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleNavSearch();
    });
  }

  if (heroServiceInput) {
    heroServiceInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSearch();
    });
  }

  if (heroLocationInput) {
    heroLocationInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleSearch();
    });
  }
});
