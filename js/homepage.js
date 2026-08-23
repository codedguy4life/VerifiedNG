// ─── SEARCH HELPERS ───
function goToSearch(service = "", location = "") {
  const params = new URLSearchParams();
  if (service.trim()) params.set("service", service.trim());
  if (location.trim()) params.set("location", location.trim());

  window.location.href = `search.html${params.toString() ? "?" + params.toString() : ""}`;
}

// ─── NAV SEARCH ───
function handleNavSearch() {
  const input = document.getElementById("navServiceInput");
  const service = input ? input.value.trim() : "";
  if (service) goToSearch(service, "");
}

// ─── HERO SEARCH ───
function handleSearch() {
  const serviceInput = document.getElementById("serviceInput");
  const locationInput = document.getElementById("locationInput");

  const service = serviceInput ? serviceInput.value.trim() : "";
  const location = locationInput ? locationInput.value.trim() : "";

  if (!service && !location) {
    if (serviceInput) serviceInput.focus();
    return;
  }

  goToSearch(service, location);
}

// ─── CATEGORY COUNTS FROM DATABASE ───
function loadCategoryCounts() {
  fetch(`${API_URL}/api/providers/counts`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.counts) return;
      const counts = data.counts;
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
        if (el && counts[cat] !== undefined) {
          el.textContent = counts[cat] + " providers";
        }
      });
    })
    .catch((err) => console.log("Could not load counts:", err));
}

// ─── PROVIDER BANNER FOR LOGGED IN CUSTOMERS ───
function showProviderBanner(userData) {
  if (userData.role === "customer") {
    const banner = document.createElement("div");
    banner.style.cssText = `
      background: #1a1a2e; color: white; text-align: center;
      padding: 12px 20px; font-family: 'DM Sans', sans-serif;
      font-size: 0.9rem;
    `;
    banner.innerHTML = `
      <i class="bi bi-tools"></i> Are you a skilled provider?
      <a href="#" onclick="goToProviderSignup(); return false;"
        style="color:#00c853;font-weight:600;margin-left:8px;text-decoration:none;">
        Set up your provider profile →
      </a>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }
}

// ─── ON PAGE LOAD ───
document.addEventListener("DOMContentLoaded", function () {
  loadCategoryCounts();

  const navInput = document.getElementById("navServiceInput");
  const heroServiceInput = document.getElementById("serviceInput");
  const heroLocationInput = document.getElementById("locationInput");

  if (navInput) {
    navInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleNavSearch();
    });
  }

  if (heroServiceInput) {
    heroServiceInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  }

  if (heroLocationInput) {
    heroLocationInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  }

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      showProviderBanner(JSON.parse(storedUser));
    } catch (error) {
      console.log("Could not read saved user:", error);
    }
  }
});