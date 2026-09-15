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
        Tailoring: "countTailoring",
        Catering: "countCatering",
      };

      Object.keys(categoryMap).forEach((cat) => {
        const el = document.getElementById(categoryMap[cat]);

        if (!el) return;

        if (counts[cat] && counts[cat] > 0) {
          // Real count from database
          el.textContent =
            counts[cat] + (counts[cat] === 1 ? " provider" : " providers");

          el.style.color = "#00c853";
        } else {
          // No real providers yet — show "coming soon"
          el.textContent = "Coming soon";
          el.style.color = "#aaa";
        }
      });
    })
    .catch((err) => {
      console.log("Could not load counts:", err);
      // Static numbers remain as fallback
    });
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
// ─── FEATURED PROVIDERS FROM DATABASE ───
function loadFeaturedProviders() {
  const container = document.getElementById("homepageProviders");

  if (!container) return;

  fetch(`${API_URL}/api/providers`)
    .then(async (res) => {
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not load providers");
      }

      return data;
    })
    .then((data) => {
      const providers = data.providers || [];

      if (!providers.length) {
        container.innerHTML = `
          <p style="text-align:center; width:100%; color:#888;">
            No verified providers available yet.
          </p>
        `;
        return;
      }

      // Show the first few providers as featured providers
      container.innerHTML = providers
        .slice(0, 4)
        .map((provider) => {
          const providerId = `db_${provider._id}`;

          const location =
            [provider.city, provider.state].filter(Boolean).join(", ") ||
            "Nigeria";

          const rating = provider.rating ?? "New";
          const reviewCount = provider.reviewCount ?? 0;

          const skills = Array.isArray(provider.skills)
            ? provider.skills.slice(0, 3)
            : [];

          const price = provider.price || "Talk-Price";
          const per = provider.per || "job";

          return `
            <div
              class="provider-card"
              onclick="window.location.href='all-providers-profile.html?id=${providerId}'"
            >
              <div class="pc-header">
                <div class="pc-avatar">
                  <i class="bi bi-person"></i>
                </div>

                <div class="pc-info">
                  <h4>${provider.fullName || "Verified Provider"}</h4>
                  <div class="pc-role">
                    ${provider.category || "Service Provider"}
                  </div>
                </div>

                ${
                  provider.isVerified
                    ? `
                      <div class="pc-verified">
                        <i class="bi bi-patch-check"></i> Verified
                      </div>
                    `
                    : ""
                }
              </div>

              <div class="pc-body">
                <div class="pc-rating">
                  <span class="score">${rating}</span>
                  <span class="stars"><sup>★★★★★</sup></span>
                  <span class="count">(${reviewCount} reviews)</span>
                </div>

                <div class="pc-tags">
                  <span class="tag">${location}</span>

                  ${
                    skills.length
                      ? skills
                          .map((skill) => `<span class="tag">${skill}</span>`)
                          .join("")
                      : `<span class="tag">${provider.category || "Services"}</span>`
                  }
                </div>

                <div class="pc-footer">
                  <div class="pc-price">
                    <div class="from">Starting from</div>
                    <span class="amount">₦${price}</span>
                    <span class="per">/${per}</span>
                  </div>

                  <button
                    class="btn-hire-sm"
                    type="button"
                    onclick="event.stopPropagation(); window.location.href='all-providers-profile.html?id=${providerId}'"
                  >
                    Hire Now
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    })
    .catch((error) => {
      console.error("Could not load featured providers:", error);

      container.innerHTML = `
        <p style="text-align:center; width:100%; color:#888;">
          Unable to load providers right now.
        </p>
      `;
    });
}

// ─── ON PAGE LOAD ───
document.addEventListener("DOMContentLoaded", function () {
  loadCategoryCounts();
  loadFeaturedProviders();

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
