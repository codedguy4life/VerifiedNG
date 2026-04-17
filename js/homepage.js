// ─── NAV SEARCH ───
function handleNavSearch() {
  const service = document.getElementById("navServiceInput").value.trim();
  if (service) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=Nigeria`;
  }
}

// ─── HERO SEARCH ───
function handleSearch() {
  const service = document.getElementById("serviceInput").value.trim();
  const location = document.getElementById("locationInput").value.trim();
  if (service || location) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`;
  }
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
        if (el && counts[cat]) {
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
  // Load real category counts
  loadCategoryCounts();

  // Enter key on search inputs
  const navInput = document.getElementById("navServiceInput");
  const heroServiceInput = document.getElementById("serviceInput");
  const heroLocationInput = document.getElementById("locationInput");

  if (navInput) navInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleNavSearch(); });
  if (heroServiceInput) heroServiceInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });
  if (heroLocationInput) heroLocationInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });

  // Show provider banner for logged in customers
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const userData = JSON.parse(storedUser);
    showProviderBanner(userData);
  }
});