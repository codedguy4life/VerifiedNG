// ─── SEARCH PAGE JS ───

let currentView = "grid";

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    service: params.get("service") || "All Services",
    location: params.get("location") || "Nigeria",
  };
}

function renderCards(list) {
  const grid = document.getElementById("resultsGrid");

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div class="nr-icon"><i class="bi bi-search"></i></div>
        <h3>No providers found</h3>
        <p>Try adjusting your filters or search a different service.</p>
      </div>
    `;
    document.getElementById("resultCount").textContent = "0";
    return;
  }

  document.getElementById("resultCount").textContent = list.length;

  grid.innerHTML = list.map((p, i) => `
    <div class="provider-card" style="animation-delay: ${i * 0.07}s" onclick="window.location.href='all-providers-profile.html?id=${p.id}'">
      <div class="card-top">
        <div class="card-avatar" style="background:${p.avatarBg}">
          <i class="${p.icon}"></i>
        </div>
        <div class="card-info">
          <div class="card-name-row">
            <span class="card-name">${p.name}</span>
            ${p.verified ? '<span class="verified-pill"><i class="bi bi-patch-check"></i> Verified</span>' : ""}
          </div>
          <div class="card-role">${p.role}</div>
          <div class="card-rating">
            <span class="stars">★★★★★</span>
            <span class="score">${p.rating}</span>
            <span class="reviews">(${p.reviews} reviews)</span>
          </div>
          <div class="card-location">
            <i class="bi bi-geo-alt-fill"></i> ${p.location}
          </div>
        </div>
      </div>

      <div class="card-body">
        <div class="card-tags">
          ${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}
        </div>
        <p class="card-bio">${p.bio.substring(0, 120)}...</p>
        <div class="card-stats">
          <div class="cs-box">
            <div class="cs-val">${p.jobs}<sup>+</sup></div>
            <div class="cs-label">Jobs Done</div>
          </div>
          <div class="cs-box">
            <div class="cs-val">${p.experienceYears}</div>
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
            <button class="btn-msg"><i class="bi bi-chat-dots"></i> Message</button>
            <button class="btn-hire" onclick="event.stopPropagation(); window.location.href='all-providers-profile.html?id=${p.id}'">Hire Now</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function applyFilters() {
  let filtered = [...providers];

  const checkedCategories = [...document.querySelectorAll("#categoryFilter input:checked")].map((i) => i.value);
  if (checkedCategories.length > 0) {
    filtered = filtered.filter((p) => checkedCategories.includes(p.category));
  }

  const checkedLocations = [...document.querySelectorAll("#locationFilter input:checked")].map((i) => i.value);
  if (checkedLocations.length > 0) {
    filtered = filtered.filter((p) => checkedLocations.includes(p.locationKey));
  }

  const minRating = parseFloat(document.querySelector('input[name="rating"]:checked')?.value || 0);
  if (minRating > 0) {
    filtered = filtered.filter((p) => p.rating >= minRating);
  }

  const sortBy = document.getElementById("sortSelect").value;
  if (sortBy === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sortBy === "jobs") filtered.sort((a, b) => b.jobs - a.jobs);

  renderCards(filtered);
}

function clearFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  document.querySelector('input[name="rating"][value="0"]').checked = true;
  applyFilters();
}

function setView(view, btn) {
  currentView = view;
  const grid = document.getElementById("resultsGrid");
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  grid.className = view === "list" ? "results-grid list-view" : "results-grid";
}

function handleSearch() {
  const service = document.getElementById("navServiceInput").value.trim();
  const location = document.getElementById("navLocationInput").value.trim();
  if (service || location) {
    window.location.href = `search.html?service=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`;
  }
}

function removeServiceFilter() {
  document.getElementById("activeServiceTag").style.display = "none";
}

function removeLocationFilter() {
  document.getElementById("activeLocationTag").style.display = "none";
}

function openFilters() {
  const content = document.getElementById("drawerContent");
  content.innerHTML = document.getElementById("sidebarFilters").innerHTML;
  document.getElementById("filterOverlay").classList.add("open");
  document.getElementById("filterDrawer").classList.add("open");
}

function closeFilters() {
  document.getElementById("filterOverlay").classList.remove("open");
  document.getElementById("filterDrawer").classList.remove("open");
}

window.onload = function () {
  const { service, location } = getUrlParams();

  document.getElementById("searchTermDisplay").textContent = `"${service}"`;
  document.getElementById("locationDisplay").innerHTML = `<i class="bi bi-geo-alt-fill"></i> ${location}`;
  document.getElementById("activeServiceTag").innerHTML =
    `<i class="bi bi-tools"></i> ${service} <button onclick="removeServiceFilter()">✕</button>`;

  if (location && location !== "Nigeria") {
    const locTag = document.getElementById("activeLocationTag");
    locTag.innerHTML = `<i class="bi bi-geo-alt"></i> ${location} <button onclick="removeLocationFilter()">✕</button>`;
    locTag.style.display = "inline-flex";
  }

  document.getElementById("navServiceInput").value = service !== "All Services" ? service : "";
  document.getElementById("navLocationInput").value = location !== "Nigeria" ? location : "";

  if (service && service !== "All Services") {
    document.querySelectorAll("#categoryFilter input[type='checkbox']").forEach((cb) => {
      if (cb.value.toLowerCase() === service.toLowerCase()) cb.checked = true;
    });
  }

  renderCards(providers);
  applyFilters();

  // Update nav based on login state
  const user = getCurrentUser();
  const navActions = document.querySelector(".nav-actions");
  if (navActions && user) {
    navActions.innerHTML = `
      <a href="dashboard.html" class="btn-ghost" style="text-decoration:none">
        Hi, ${user.fullName.split(" ")[0]} <i class="bi bi-person-circle"></i>
      </a>
      <button class="btn-ghost" onclick="signOut()">Sign Out</button>
    `;
  }
};