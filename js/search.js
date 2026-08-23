// ─── SEARCH NORMALIZATION ───
function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common words customers are likely to use when searching.
const serviceAliases = {
  plumbing: ["plumber", "plumbing", "pipe", "pipes", "drainage", "water", "leak", "leaking", "toilet"],
  electrical: ["electrician", "electric", "electrical", "wiring", "wire", "generator", "solar", "inverter", "power"],
  tutoring: ["tutor", "tutoring", "teacher", "teaching", "lesson", "lessons", "waec", "jamb", "mathematics", "math", "physics", "chemistry", "english"],
  "auto mechanic": ["mechanic", "mechanics", "car", "cars", "automobile", "auto", "vehicle", "vehicles", "diagnostics", "toyota", "honda"],
  cleaning: ["cleaner", "cleaning", "clean", "housekeeping", "laundry", "home cleaning", "deep cleaning"],
  photography: ["photographer", "photography", "photo", "photos", "portrait", "portraits", "wedding photography", "events photography"],
  tailoring: ["tailor", "tailoring", "fashion", "seamstress", "sewing", "designer", "clothes", "cloth"],
  catering: ["caterer", "catering", "cook", "cooking", "chef", "food", "baking", "baker", "pastry", "small chops"],
  programming: ["programmer", "programming", "developer", "software", "web developer", "website", "coding", "app developer"],
  contentcreator: ["content creator", "content creation", "creator", "video creator", "videographer", "social media"],
  "graphic designer": ["graphic designer", "graphics", "graphic design", "logo", "branding", "flyer", "design"],
  carpenter: ["carpenter", "carpentry", "furniture", "woodwork", "wood"],
  painter: ["painter", "painting", "house painting", "wall painting"],
  driver: ["driver", "driving", "chauffeur", "delivery driver", "dispatch"],
};

function canonicalCategory(value) {
  const text = normalizeSearchText(value).replace(/\s+/g, " ");
  if (!text) return "";

  for (const [category, aliases] of Object.entries(serviceAliases)) {
    if (category === text || aliases.some((alias) => text === alias || text.includes(alias) || alias.includes(text))) {
      return category;
    }
  }

  return text;
}

function providerSearchText(provider) {
  return normalizeSearchText([
    provider.name,
    provider.role,
    provider.category,
    provider.location,
    provider.locationKey,
    ...(provider.tags || []),
    ...(provider.skills || []),
    provider.bio,
  ].join(" "));
}

function matchesService(provider, query) {
  const q = normalizeSearchText(query);
  if (!q || q === "all services" || q === "all") return true;

  const canonical = canonicalCategory(q);
  const text = providerSearchText(provider);
  const category = canonicalCategory(provider.category);
  const role = normalizeSearchText(provider.role);

  // Direct full-text match first.
  if (text.includes(q)) return true;

  // Match the normalized category.
  if (category === canonical || category.includes(canonical) || canonical.includes(category)) return true;

  // Match any known alias against the provider's category/role/skills.
  const aliases = serviceAliases[canonical] || [];
  if (aliases.some((alias) => text.includes(normalizeSearchText(alias)))) return true;

  // Finally, match individual words for searches such as "math tutor".
  const words = q.split(" ").filter((word) => word.length > 2);
  return words.length > 0 && words.every((word) => text.includes(word) || role.includes(word));
}

function matchesLocation(provider, query) {
  const q = normalizeSearchText(query);
  if (!q || q === "nigeria" || q === "all locations" || q === "all") return true;

  const location = normalizeSearchText([
    provider.location,
    provider.locationKey,
    provider.state,
    provider.city,
  ].join(" "));

  // Handle common Nigerian location variations.
  const locationAliases = {
    fct: ["abuja", "federal capital territory", "fct"],
    abuja: ["abuja", "fct", "federal capital territory"],
    lagos: ["lagos", "ikeja", "lekki", "yaba", "surulere", "victoria island", "vi", "ajah"],
    ogun: ["ogun", "abeokuta", "ota", "ijebu"],
    rivers: ["rivers", "port harcourt", "ph"],
    "port harcourt": ["port harcourt", "ph", "rivers"],
    kwara: ["kwara", "ilorin", "offa", "malete"],
    delta: ["delta", "warri", "asaba", "sapele"],
  };

  if (location.includes(q)) return true;

  const aliases = locationAliases[q] || [];
  if (aliases.some((alias) => location.includes(normalizeSearchText(alias)))) return true;

  return false;
}

// ─── FETCH REAL PROVIDERS FROM BACKEND ───
async function loadRealProviders() {
  try {
    const response = await fetch(`${API_URL}/api/providers`);
    const data = await response.json();

    if (data.providers && data.providers.length > 0) {
      const dbProviders = data.providers.map((p) => ({
        id: "db_" + p._id,
        dbId: p._id,
        name: p.fullName,
        role: p.category || "Service Provider",
        category: p.category || "Other",
        icon: getCategoryIcon(p.category),
        avatarBg: getAvatarBg(p.category),
        rating: Number(p.rating) || 4.5,
        reviewCount: Number(p.reviewCount) || 0,
        jobs: Number(p.jobs) || 0,
        experienceYears: p.experienceYears || "New",
        location: p.city && p.state ? `${p.city}, ${p.state}` : p.state || p.city || "Nigeria",
        locationKey: p.state || p.city || "Nigeria",
        city: p.city || "",
        state: p.state || "",
        availability: "online",
        availText: "Available Now",
        tags: p.skills ? p.skills.slice(0, 3) : [p.category || "Service"],
        bio: p.bio || "Verified service provider on VerifiedNG.",
        price: p.price || "₦Talk-Price",
        per: p.per || "/job",
        verified: p.isVerified || false,
        reviews: [],
        gallery: [],
        experience: [],
        skills: p.skills || [],
      }));

      providers.unshift(...dbProviders);
    }
  } catch (error) {
    console.log("Could not load live providers:", error);
  }
}

function getCategoryIcon(category) {
  const icons = {
    Plumbing: "bi bi-tools",
    Electrical: "bi bi-lightning-charge",
    "Auto Mechanic": "bi bi-car-front",
    Tutoring: "bi bi-book",
    Cleaning: "bi bi-stars",
    Photography: "bi bi-camera",
    Tailoring: "bi bi-scissors",
    Catering: "bi bi-cup-hot",
    Programming: "bi bi-laptop",
    ContentCreator: "bi bi-camera-video",
    "Graphic Designer": "bi bi-palette",
    Carpenter: "bi bi-hammer",
    Painter: "bi bi-brush",
    Driver: "bi bi-truck",
  };
  return icons[category] || "bi bi-person-workspace";
}

function getAvatarBg(category) {
  const bgs = {
    Plumbing: "#e6f9ee",
    Electrical: "#fffbec",
    "Auto Mechanic": "#eef3ff",
    Tutoring: "#fff8ec",
    Cleaning: "#f0f0ff",
    Photography: "#ffeef3",
    Tailoring: "#ffeef3",
    Catering: "#e6f9ee",
    Programming: "#eef3ff",
  };
  return bgs[category] || "#f5f5f5";
}

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
        <p>Try a broader service name, another nearby area, or remove a filter.</p>
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
            <span class="reviews">(${p.reviewCount} reviews)</span>
          </div>
          <div class="card-location">
            <i class="bi bi-geo-alt-fill"></i> ${p.location}
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-tags">${(p.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        <p class="card-bio">${(p.bio || "").substring(0, 120)}${(p.bio || "").length > 120 ? "..." : ""}</p>
        <div class="card-stats">
          <div class="cs-box"><div class="cs-val">${p.jobs}<sup>+</sup></div><div class="cs-label">Jobs Done</div></div>
          <div class="cs-box"><div class="cs-val">${p.experienceYears}</div><div class="cs-label">Experience</div></div>
          <div class="cs-box"><div class="cs-val">${p.rating}★</div><div class="cs-label">Rating</div></div>
        </div>
      </div>
      <div class="card-footer">
        <div class="price-info"><div class="from">Starting price</div><span class="amount">${p.price}</span><span class="per">${p.per}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <div class="avail-text"><span class="avail-dot ${p.availability}"></span>${p.availText}</div>
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
  const { service, location } = getUrlParams();

  // First apply the homepage search itself.
  if (service && service !== "All Services") {
    filtered = filtered.filter((p) => matchesService(p, service));
  }

  if (location && location !== "Nigeria") {
    filtered = filtered.filter((p) => matchesLocation(p, location));
  }

  const checkedCategories = [...document.querySelectorAll("#categoryFilter input:checked")].map((i) => i.value);
  if (checkedCategories.length > 0) {
    filtered = filtered.filter((p) => checkedCategories.some((cat) => matchesService(p, cat)));
  }

  const checkedLocations = [...document.querySelectorAll("#locationFilter input:checked")].map((i) => i.value);
  if (checkedLocations.length > 0) {
    filtered = filtered.filter((p) => checkedLocations.some((loc) => matchesLocation(p, loc)));
  }

  const minRating = parseFloat(document.querySelector('input[name="rating"]:checked')?.value || 0);
  if (minRating > 0) filtered = filtered.filter((p) => p.rating >= minRating);

  const sortBy = document.getElementById("sortSelect")?.value;
  if (sortBy === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sortBy === "jobs") filtered.sort((a, b) => b.jobs - a.jobs);

  renderCards(filtered);
}

function clearFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  const anyRating = document.querySelector('input[name="rating"][value="0"]');
  if (anyRating) anyRating.checked = true;
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
  const service = document.getElementById("navServiceInput")?.value.trim() || "";
  const location = document.getElementById("navLocationInput")?.value.trim() || "";
  if (!service && !location) return;
  const params = new URLSearchParams();
  if (service) params.set("service", service);
  if (location) params.set("location", location);
  window.location.href = `search.html?${params.toString()}`;
}

function removeServiceFilter() {
  const params = new URLSearchParams(window.location.search);
  params.delete("service");
  window.location.href = `search.html${params.toString() ? "?" + params.toString() : ""}`;
}

function removeLocationFilter() {
  const params = new URLSearchParams(window.location.search);
  params.delete("location");
  window.location.href = `search.html${params.toString() ? "?" + params.toString() : ""}`;
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

window.onload = async function () {
  await loadRealProviders();

  const { service, location } = getUrlParams();
  const searchDisplay = document.getElementById("searchTermDisplay");
  const locationDisplay = document.getElementById("locationDisplay");
  if (searchDisplay) searchDisplay.textContent = `"${service}"`;
  if (locationDisplay) locationDisplay.innerHTML = `<i class="bi bi-geo-alt-fill"></i> ${location}`;

  const serviceTag = document.getElementById("activeServiceTag");
  if (serviceTag) {
    serviceTag.innerHTML = `<i class="bi bi-tools"></i> ${service} <button onclick="removeServiceFilter()">✕</button>`;
    serviceTag.style.display = service !== "All Services" ? "inline-flex" : "none";
  }

  const locTag = document.getElementById("activeLocationTag");
  if (locTag) {
    locTag.innerHTML = `<i class="bi bi-geo-alt"></i> ${location} <button onclick="removeLocationFilter()">✕</button>`;
    locTag.style.display = location !== "Nigeria" ? "inline-flex" : "none";
  }

  const serviceInput = document.getElementById("navServiceInput");
  const locationInput = document.getElementById("navLocationInput");
  if (serviceInput) serviceInput.value = service !== "All Services" ? service : "";
  if (locationInput) locationInput.value = location !== "Nigeria" ? location : "";

  // Auto-select the closest category for the search term.
  if (service && service !== "All Services") {
    document.querySelectorAll("#categoryFilter input[type='checkbox']").forEach((cb) => {
      if (matchesService({ category: cb.value, role: cb.value, tags: [], skills: [], bio: "", location: "", locationKey: "" }, service)) {
        cb.checked = true;
      }
    });
  }

  applyFilters();

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const navActions = document.querySelector(".nav-actions");
  if (navActions && user) {
    navActions.innerHTML = `
      <a href="dashboard.html" class="btn-ghost" style="text-decoration:none">Hi, ${user.fullName.split(" ")[0]} <i class="bi bi-person-circle"></i></a>
      <button class="btn-ghost" onclick="signOut()">Sign Out</button>
    `;
  }

  if (serviceInput) serviceInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });
  if (locationInput) locationInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSearch(); });
};