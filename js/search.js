// ─── DATA ───
// This is your "fake database" for now.
// Later this will come from a real backend/API.

// ─── STATE ───
let currentProviders = [...providers];
let currentView = "grid";

// ─── READ URL PARAMS ───
// This reads whatever was searched on the homepage
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    service: params.get("service") || "All Services",
    location: params.get("location") || "Nigeria",
  };
}

// ─── RENDER CARDS ───
function renderCards(list) {
  const grid = document.getElementById("resultsGrid");

  if (list.length === 0) {
    grid.innerHTML = `
          <div class="no-results">
            <div class="nr-icon">🔍</div>
            <h3>No providers found</h3>
            <p>Try adjusting your filters or search a different service.</p>
          </div>
        `;
    document.getElementById("resultCount").textContent = "0";
    return;
  }

  document.getElementById("resultCount").textContent = list.length;

  grid.innerHTML = list
    .map(
      (p, i) => `
        <div class="provider-card" style="animation-delay: ${i * 0.07}s" onclick="window.location.href='all-providers-profile.html?id=${p.id}'">
          <div class="card-top">
            <div class="card-avatar" style="background:${p.avatarBg}">${p.emoji}</div>
            <div class="card-info">
              <div class="card-name-row">
                <span class="card-name">${p.name}</span>
                ${p.verified ? '<span class="verified-pill">✓ Verified</span>' : ""}
              </div>
              <div class="card-role">${p.role}</div>
              <div class="card-rating">
                <span class="stars">★★★★★</span>
                <span class="score">${p.rating}</span>
                <span class="reviews">(${p.reviews} reviews)</span>
              </div>
              <div class="card-location">📍 ${p.location}</div>
            </div>
          </div>

          <div class="card-body">
            <div class="card-tags">
              ${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
            </div>
            <p class="card-bio">${p.bio}</p>
            <div class="card-stats">
              <div class="cs-box">
                <div class="cs-val">${p.jobs}<sup>+</sup></div>
                <div class="cs-label">Jobs Done</div>
              </div>
              <div class="cs-box">
                <div class="cs-val">${p.experienceYears}<sup>+</sup></div>
                <div class="cs-label">Experience</div>
              </div>
              <div class="cs-box">
                <div class="cs-val">${p.rating}★</div>
                <div class="cs-label">Rating</div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="price-info">
              <div class="from">Starting price</div>
              <span class="amount">${p.price}</span>
              <span class="per">${p.per}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
              <div class="avail-text">
                <span class="avail-dot ${p.availability}"></span>${p.availText}
              </div>
              <div class="card-actions">
                <button class="btn-msg">Message</button>
                <button class="btn-hire" onclick="event.stopPropagation(); window.location.href='all-providers-profile.html?id=${p.id}'">Hire Now</button>
              </div>
            </div>
          </div>
        </div>
      `,
    )
    .join("");
}

// ─── APPLY FILTERS ───
function applyFilters() {
  let filtered = [...providers];

  // Category checkboxes
  const checkedCategories = [
    ...document.querySelectorAll("#categoryFilter input:checked"),
  ].map((i) => i.value);
  if (checkedCategories.length > 0) {
    filtered = filtered.filter((p) => checkedCategories.includes(p.category));
  }

  // Location checkboxes
  const checkedLocations = [
    ...document.querySelectorAll("#locationFilter input:checked"),
  ].map((i) => i.value);
  if (checkedLocations.length > 0) {
    filtered = filtered.filter((p) => checkedLocations.includes(p.locationKey));
  }

  // Rating
  const minRating = parseFloat(
    document.querySelector('input[name="rating"]:checked')?.value || 0,
  );
  if (minRating > 0) {
    filtered = filtered.filter((p) => p.rating >= minRating);
  }

  // Sort
  const sortBy = document.getElementById("sortSelect").value;
  if (sortBy === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sortBy === "jobs") filtered.sort((a, b) => b.jobs - a.jobs);

  renderCards(filtered);
}

// ─── CLEAR FILTERS ───
function clearFilters() {
  document
    .querySelectorAll('input[type="checkbox"]')
    .forEach((cb) => (cb.checked = false));
  document.querySelector('input[name="rating"][value="0"]').checked = true;
  applyFilters();
}

// ─── VIEW TOGGLE ───
function setView(view, btn) {
  currentView = view;
  const grid = document.getElementById("resultsGrid");
  document
    .querySelectorAll(".view-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  grid.className = view === "list" ? "results-grid list-view" : "results-grid";
}

// ─── SEARCH HANDLER ───
function handleSearch() {
  const service = document.getElementById("navServiceInput").value.trim();
  const location = document.getElementById("navLocationInput").value.trim();
  if (service || location) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`;
  }
}

// ─── ACTIVE TAGS ───
function removeServiceFilter() {
  document.getElementById("activeServiceTag").style.display = "none";
}
function removeLocationFilter() {
  document.getElementById("activeLocationTag").style.display = "none";
}

// ─── MOBILE FILTERS ───
function openFilters() {
  const overlay = document.getElementById("filterOverlay");
  const drawer = document.getElementById("filterDrawer");
  const content = document.getElementById("drawerContent");
  content.innerHTML = document.getElementById("sidebarFilters").innerHTML;
  overlay.classList.add("open");
  drawer.classList.add("open");
}

function closeFilters() {
  document.getElementById("filterOverlay").classList.remove("open");
  document.getElementById("filterDrawer").classList.remove("open");
}

// ─── INIT ───
// Runs when page loads
window.onload = function () {
  const { service, location } = getUrlParams();

  // Update page title and tags
  document.getElementById("searchTermDisplay").textContent = `"${service}"`;
  document.getElementById("locationDisplay").textContent = `📍 ${location}`;
  document.getElementById("activeServiceTag").innerHTML =
    `🔧 ${service} <button onclick="removeServiceFilter()">✕</button>`;

  if (location && location !== "Nigeria") {
    const locTag = document.getElementById("activeLocationTag");
    locTag.innerHTML = `📍 ${location} <button onclick="removeLocationFilter()">✕</button>`;
    locTag.style.display = "inline-flex";
  }

  // Fill nav inputs with current search
  document.getElementById("navServiceInput").value =
    service !== "All Services" ? service : "";
  document.getElementById("navLocationInput").value =
    location !== "Nigeria" ? location : "";

  // Auto-tick the matching category checkbox ──
  if (service && service !== "All Services") {
    const checkboxes = document.querySelectorAll(
      "#categoryFilter input[type='checkbox']",
    );
    checkboxes.forEach((cb) => {
      if (cb.value.toLowerCase() === service.toLowerCase()) {
        cb.checked = true;
        console.log("✅ Auto-selected:", cb.value);
      }
    });
  }

  renderCards(providers);
  applyFilters(); // ← this applies the pre-ticked filter immediately
};
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
