// ─────────────────────────────────────────────
// SEARCH NORMALIZATION
// ─────────────────────────────────────────────

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// ─────────────────────────────────────────────
// SERVICE ALIASES
// ─────────────────────────────────────────────

const serviceAliases = {
  plumbing: [
    "plumber",
    "plumbing",
    "pipe",
    "pipes",
    "drainage",
    "water",
    "leak",
    "leaking",
    "toilet"
  ],

  electrical: [
    "electrician",
    "electric",
    "electrical",
    "wiring",
    "wire",
    "generator",
    "solar",
    "inverter",
    "power"
  ],

  tutoring: [
    "tutor",
    "tutoring",
    "teacher",
    "teaching",
    "lesson",
    "lessons",
    "waec",
    "jamb",
    "mathematics",
    "math",
    "physics",
    "chemistry",
    "english"
  ],

  "auto mechanic": [
    "mechanic",
    "mechanics",
    "car",
    "cars",
    "automobile",
    "auto",
    "vehicle",
    "vehicles",
    "diagnostics",
    "toyota",
    "honda"
  ],

  cleaning: [
    "cleaner",
    "cleaning",
    "clean",
    "housekeeping",
    "laundry",
    "home cleaning",
    "deep cleaning"
  ],

  photography: [
    "photographer",
    "photography",
    "photo",
    "photos",
    "portrait",
    "portraits",
    "wedding photography",
    "events photography"
  ],

  tailoring: [
    "tailor",
    "tailoring",
    "fashion",
    "seamstress",
    "sewing",
    "designer",
    "clothes",
    "cloth"
  ],

  catering: [
    "caterer",
    "catering",
    "cook",
    "cooking",
    "chef",
    "food",
    "baking",
    "baker",
    "pastry",
    "small chops"
  ],

  programming: [
    "programmer",
    "programming",
    "developer",
    "software",
    "web developer",
    "website",
    "coding",
    "app developer"
  ],

  contentcreator: [
    "content creator",
    "content creation",
    "creator",
    "video creator",
    "videographer",
    "social media"
  ],

  "graphic designer": [
    "graphic designer",
    "graphics",
    "graphic design",
    "logo",
    "branding",
    "flyer",
    "design"
  ],

  carpenter: [
    "carpenter",
    "carpentry",
    "furniture",
    "woodwork",
    "wood"
  ],

  painter: [
    "painter",
    "painting",
    "house painting",
    "wall painting"
  ],

  driver: [
    "driver",
    "driving",
    "chauffeur",
    "delivery driver",
    "dispatch"
  ]
};


function canonicalCategory(value) {
  const text = normalizeSearchText(value);

  if (!text) return "";

  for (const [category, aliases] of Object.entries(serviceAliases)) {
    if (
      category === text ||
      aliases.some(
        (alias) =>
          text === normalizeSearchText(alias) ||
          text.includes(normalizeSearchText(alias)) ||
          normalizeSearchText(alias).includes(text)
      )
    ) {
      return category;
    }
  }

  return text;
}


// ─────────────────────────────────────────────
// LOCATION MATCHING
// ─────────────────────────────────────────────

function matchesLocation(provider, query) {
  const q = normalizeSearchText(query);

  if (
    !q ||
    q === "nigeria" ||
    q === "all locations" ||
    q === "all"
  ) {
    return true;
  }

  const location = normalizeSearchText([
    provider.location,
    provider.locationKey,
    provider.state,
    provider.city
  ].join(" "));

  const locationAliases = {
    fct: [
      "abuja",
      "federal capital territory",
      "fct"
    ],

    abuja: [
      "abuja",
      "fct",
      "federal capital territory"
    ],

    lagos: [
      "lagos",
      "ikeja",
      "lekki",
      "yaba",
      "surulere",
      "victoria island",
      "vi",
      "ajah"
    ],

    ogun: [
      "ogun",
      "abeokuta",
      "ota",
      "ijebu"
    ],

    rivers: [
      "rivers",
      "port harcourt",
      "ph"
    ],

    "port harcourt": [
      "port harcourt",
      "ph",
      "rivers"
    ],

    kwara: [
      "kwara",
      "ilorin",
      "offa",
      "malete"
    ],

    delta: [
      "delta",
      "warri",
      "asaba",
      "sapele"
    ]
  };

  if (location.includes(q)) {
    return true;
  }

  const aliases = locationAliases[q] || [];

  return aliases.some((alias) =>
    location.includes(normalizeSearchText(alias))
  );
}


// ─────────────────────────────────────────────
// FETCH PROVIDERS FROM BACKEND
// ─────────────────────────────────────────────

async function loadRealProviders() {
  try {
    const { service, location } = getUrlParams();

    const params = new URLSearchParams();

    /*
      Send the original search to the backend.

      Example:

      search.html?service=plumber

      becomes:

      /api/providers?search=plumber
    */

    if (service && service !== "All Services") {
      params.set("search", service);
    }

    /*
      Only send location if the user actually entered one.
    */

    if (location && location !== "Nigeria") {
      params.set("state", location);
    }

    const queryString = params.toString();

    const url = queryString
      ? `${API_URL}/api/providers?${queryString}`
      : `${API_URL}/api/providers`;

    console.log("Searching providers:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const data = await response.json();

    providers.length = 0;

    if (!data.providers || data.providers.length === 0) {
      console.log("No providers returned from backend.");
      return;
    }

    const dbProviders = data.providers.map((p) => ({
      id: "db_" + p._id,
      dbId: p._id,

      name: p.fullName,

      role: p.category || "Service Provider",

      category: p.category || "Other",

      icon: getCategoryIcon(p.category),

      avatarBg: getAvatarBg(p.category),

      rating: Number(p.rating) || 0,

      reviewCount: Number(p.reviewCount) || 0,

      jobs: Number(p.jobs) || 0,

      experienceYears:
        p.experienceYears || "New",

      location:
        p.city && p.state
          ? `${p.city}, ${p.state}`
          : p.state ||
            p.city ||
            "Nigeria",

      locationKey:
        p.state ||
        p.city ||
        "Nigeria",

      city: p.city || "",

      state: p.state || "",

      availability: "online",

      availText: "Available Now",

      tags:
        Array.isArray(p.skills) &&
        p.skills.length > 0
          ? p.skills.slice(0, 3)
          : [p.category || "Service"],

      bio:
        p.bio ||
        "Verified service provider on VerifiedNG.",

      price:
        p.price ||
        "₦Talk-Price",

      per:
        p.per ||
        "/job",

      verified:
        p.isVerified || false,

      reviews: [],

      gallery: [],

      experience: [],

      skills:
        Array.isArray(p.skills)
          ? p.skills
          : []
    }));

    providers.push(...dbProviders);

    console.log(
      "Real providers loaded:",
      providers
    );

  } catch (error) {

    console.error(
      "Could not load providers:",
      error
    );

    providers.length = 0;
  }
}


// ─────────────────────────────────────────────
// CATEGORY ICONS
// ─────────────────────────────────────────────

function getCategoryIcon(category) {

  const icons = {

    Plumbing:
      "bi bi-tools",

    Electrical:
      "bi bi-lightning-charge",

    "Auto Mechanic":
      "bi bi-car-front",

    Tutoring:
      "bi bi-book",

    Cleaning:
      "bi bi-stars",

    Photography:
      "bi bi-camera",

    Tailoring:
      "bi bi-scissors",

    Catering:
      "bi bi-cup-hot",

    Programming:
      "bi bi-laptop",

    ContentCreator:
      "bi bi-camera-video",

    "Graphic Designer":
      "bi bi-palette",

    Carpenter:
      "bi bi-hammer",

    Painter:
      "bi bi-brush",

    Driver:
      "bi bi-truck"
  };

  return (
    icons[category] ||
    "bi bi-person-workspace"
  );
}


// ─────────────────────────────────────────────
// AVATAR BACKGROUNDS
// ─────────────────────────────────────────────

function getAvatarBg(category) {

  const bgs = {

    Plumbing:
      "#e6f9ee",

    Electrical:
      "#fffbec",

    "Auto Mechanic":
      "#eef3ff",

    Tutoring:
      "#fff8ec",

    Cleaning:
      "#f0f0ff",

    Photography:
      "#ffeef3",

    Tailoring:
      "#ffeef3",

    Catering:
      "#e6f9ee",

    Programming:
      "#eef3ff"
  };

  return (
    bgs[category] ||
    "#f5f5f5"
  );
}


// ─────────────────────────────────────────────
// SEARCH PAGE
// ─────────────────────────────────────────────

let currentView = "grid";


function getUrlParams() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return {

    service:
      params.get("service") ||
      "All Services",

    location:
      params.get("location") ||
      "Nigeria"
  };
}


// ─────────────────────────────────────────────
// RENDER PROVIDER CARDS
// ─────────────────────────────────────────────

function renderCards(list) {

  const grid =
    document.getElementById(
      "resultsGrid"
    );

  if (!grid) return;


  if (list.length === 0) {

    grid.innerHTML = `
      <div class="no-results">

        <div class="nr-icon">
          <i class="bi bi-search"></i>
        </div>

        <h3>No providers found</h3>

        <p>
          Try a broader service name,
          another nearby area,
          or remove a filter.
        </p>

      </div>
    `;

    document.getElementById(
      "resultCount"
    ).textContent = "0";

    return;
  }


  document.getElementById(
    "resultCount"
  ).textContent = list.length;


  grid.innerHTML = list.map(
    (p, i) => `

    <div
      class="provider-card"
      style="animation-delay:${i * 0.07}s"
      onclick="window.location.href='all-providers-profile.html?id=${p.id}'"
    >

      <div class="card-top">

        <div
          class="card-avatar"
          style="background:${p.avatarBg}"
        >
          <i class="${p.icon}"></i>
        </div>

        <div class="card-info">

          <div class="card-name-row">

            <span class="card-name">
              ${p.name}
            </span>

            ${
              p.verified
                ? `
                  <span class="verified-pill">
                    <i class="bi bi-patch-check"></i>
                    Verified
                  </span>
                `
                : ""
            }

          </div>

          <div class="card-role">
            ${p.role}
          </div>

          <div class="card-rating">

            <span class="stars">
              ★★★★★
            </span>

            <span class="score">
              ${p.rating}
            </span>

            <span class="reviews">
              (${p.reviewCount} reviews)
            </span>

          </div>

          <div class="card-location">

            <i class="bi bi-geo-alt-fill"></i>

            ${p.location}

          </div>

        </div>

      </div>


      <div class="card-body">

        <div class="card-tags">

          ${(p.tags || [])
            .map(
              (t) =>
                `<span class="tag">${t}</span>`
            )
            .join("")}

        </div>

        <p class="card-bio">

          ${(p.bio || "").substring(
            0,
            120
          )}

          ${
            (p.bio || "").length > 120
              ? "..."
              : ""
          }

        </p>


        <div class="card-stats">

          <div class="cs-box">

            <div class="cs-val">
              ${p.jobs}<sup>+</sup>
            </div>

            <div class="cs-label">
              Jobs Done
            </div>

          </div>


          <div class="cs-box">

            <div class="cs-val">
              ${p.experienceYears}
            </div>

            <div class="cs-label">
              Experience
            </div>

          </div>


          <div class="cs-box">

            <div class="cs-val">
              ${p.rating}★
            </div>

            <div class="cs-label">
              Rating
            </div>

          </div>

        </div>

      </div>


      <div class="card-footer">

        <div class="price-info">

          <div class="from">
            Starting price
          </div>

          <span class="amount">
            ${p.price}
          </span>

          <span class="per">
            ${p.per}
          </span>

        </div>


        <div
          style="
            display:flex;
            flex-direction:column;
            align-items:flex-end;
            gap:6px;
          "
        >

          <div class="avail-text">

            <span
              class="avail-dot ${p.availability}"
            ></span>

            ${p.availText}

          </div>


          <div class="card-actions">

            <button
              class="btn-msg"
              onclick="event.stopPropagation()"
            >
              <i class="bi bi-chat-dots"></i>
              Message
            </button>

            <button
              class="btn-hire"
              onclick="
                event.stopPropagation();
                window.location.href='all-providers-profile.html?id=${p.id}'
              "
            >
              Hire Now
            </button>

          </div>

        </div>

      </div>

    </div>

  `
  ).join("");
}


// ─────────────────────────────────────────────
// APPLY FILTERS
// ─────────────────────────────────────────────

function applyFilters() {

  let filtered = [
    ...providers
  ];

  const {
    service,
    location
  } = getUrlParams();


  // SERVICE
  if (
    service &&
    service !== "All Services"
  ) {

    const canonical =
      canonicalCategory(service);

    filtered =
      filtered.filter((p) => {

        const providerCategory =
          canonicalCategory(
            p.category
          );

        const providerText =
          normalizeSearchText(
            [
              p.name,
              p.category,
              p.role,
              p.bio,
              ...(p.skills || [])
            ].join(" ")
          );

        return (
          providerText.includes(
            normalizeSearchText(service)
          ) ||
          providerCategory === canonical ||
          providerCategory.includes(
            canonical
          ) ||
          canonical.includes(
            providerCategory
          ) ||
          (
            serviceAliases[canonical] &&
            serviceAliases[canonical].some(
              (alias) =>
                providerText.includes(
                  normalizeSearchText(alias)
                )
            )
          )
        );

      });

  }


  // LOCATION
  if (
    location &&
    location !== "Nigeria"
  ) {

    filtered =
      filtered.filter((p) =>
        matchesLocation(
          p,
          location
        )
      );

  }


  // CATEGORY FILTER
  const checkedCategories =
    [
      ...document.querySelectorAll(
        "#categoryFilter input:checked"
      )
    ].map(
      (input) => input.value
    );


  if (
    checkedCategories.length > 0
  ) {

    filtered =
      filtered.filter((p) =>
        checkedCategories.some(
          (category) =>
            canonicalCategory(
              p.category
            ) ===
            canonicalCategory(
              category
            )
        )
      );

  }


  // LOCATION FILTER
  const checkedLocations =
    [
      ...document.querySelectorAll(
        "#locationFilter input:checked"
      )
    ].map(
      (input) => input.value
    );


  if (
    checkedLocations.length > 0
  ) {

    filtered =
      filtered.filter((p) =>
        checkedLocations.some(
          (location) =>
            matchesLocation(
              p,
              location
            )
        )
      );

  }


  // RATING
  const minRating =
    parseFloat(
      document.querySelector(
        'input[name="rating"]:checked'
      )?.value || 0
    );


  if (minRating > 0) {

    filtered =
      filtered.filter(
        (p) =>
          p.rating >= minRating
      );

  }


  // SORT
  const sortBy =
    document.getElementById(
      "sortSelect"
    )?.value;


  if (sortBy === "rating") {

    filtered.sort(
      (a, b) =>
        b.rating - a.rating
    );

  }


  if (sortBy === "jobs") {

    filtered.sort(
      (a, b) =>
        b.jobs - a.jobs
    );

  }


  if (sortBy === "newest") {

    // Backend already returns
    // newest first.

  }


  renderCards(filtered);
}


// ─────────────────────────────────────────────
// CLEAR FILTERS
// ─────────────────────────────────────────────

function clearFilters() {

  document
    .querySelectorAll(
      'input[type="checkbox"]'
    )
    .forEach(
      (checkbox) =>
        (checkbox.checked = false)
    );


  const anyRating =
    document.querySelector(
      'input[name="rating"][value="0"]'
    );


  if (anyRating) {
    anyRating.checked = true;
  }


  applyFilters();
}


// ─────────────────────────────────────────────
// VIEW TOGGLE
// ─────────────────────────────────────────────

function setView(view, btn) {

  currentView = view;

  const grid =
    document.getElementById(
      "resultsGrid"
    );

  document
    .querySelectorAll(".view-btn")
    .forEach((button) =>
      button.classList.remove(
        "active"
      )
    );

  btn.classList.add("active");

  grid.className =
    view === "list"
      ? "results-grid list-view"
      : "results-grid";
}


// ─────────────────────────────────────────────
// NAV SEARCH
// ─────────────────────────────────────────────

function handleSearch() {

  const service =
    document
      .getElementById(
        "navServiceInput"
      )
      ?.value.trim() || "";


  const location =
    document
      .getElementById(
        "navLocationInput"
      )
      ?.value.trim() || "";


  if (!service && !location) {
    return;
  }


  const params =
    new URLSearchParams();


  if (service) {
    params.set(
      "service",
      service
    );
  }


  if (location) {
    params.set(
      "location",
      location
    );
  }


  window.location.href =
    `search.html?${params.toString()}`;
}


// ─────────────────────────────────────────────
// REMOVE SERVICE FILTER
// ─────────────────────────────────────────────

function removeServiceFilter() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  params.delete("service");

  window.location.href =
    `search.html${
      params.toString()
        ? "?" + params.toString()
        : ""
    }`;
}


// ─────────────────────────────────────────────
// REMOVE LOCATION FILTER
// ─────────────────────────────────────────────

function removeLocationFilter() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  params.delete("location");

  window.location.href =
    `search.html${
      params.toString()
        ? "?" + params.toString()
        : ""
    }`;
}


// ─────────────────────────────────────────────
// MOBILE FILTERS
// ─────────────────────────────────────────────

function openFilters() {

  const content =
    document.getElementById(
      "drawerContent"
    );

  content.innerHTML =
    document.getElementById(
      "sidebarFilters"
    ).innerHTML;

  document
    .getElementById(
      "filterOverlay"
    )
    .classList.add("open");

  document
    .getElementById(
      "filterDrawer"
    )
    .classList.add("open");
}


function closeFilters() {

  document
    .getElementById(
      "filterOverlay"
    )
    .classList.remove("open");

  document
    .getElementById(
      "filterDrawer"
    )
    .classList.remove("open");
}


// ─────────────────────────────────────────────
// PAGE LOAD
// ─────────────────────────────────────────────

window.addEventListener(
  "load",
  async function () {

    await loadRealProviders();


    const {
      service,
      location
    } = getUrlParams();


    // SEARCH TITLE
    const searchDisplay =
      document.getElementById(
        "searchTermDisplay"
      );

    if (searchDisplay) {

      searchDisplay.textContent =
        `"${service}"`;

    }


    // LOCATION DISPLAY
    const locationDisplay =
      document.getElementById(
        "locationDisplay"
      );

    if (locationDisplay) {

      locationDisplay.innerHTML =
        `
          <i class="bi bi-geo-alt-fill"></i>
          ${location}
        `;

    }


    // SERVICE TAG
    const serviceTag =
      document.getElementById(
        "activeServiceTag"
      );


    if (serviceTag) {

      serviceTag.innerHTML =
        `
          <i class="bi bi-tools"></i>
          ${service}
          <button
            onclick="removeServiceFilter()"
          >
            ✕
          </button>
        `;

      serviceTag.style.display =
        service !== "All Services"
          ? "inline-flex"
          : "none";

    }


    // LOCATION TAG
    const locTag =
      document.getElementById(
        "activeLocationTag"
      );


    if (locTag) {

      locTag.innerHTML =
        `
          <i class="bi bi-geo-alt"></i>
          ${location}

          <button
            onclick="removeLocationFilter()"
          >
            ✕
          </button>
        `;

      locTag.style.display =
        location !== "Nigeria"
          ? "inline-flex"
          : "none";

    }


    // FILL SEARCH INPUTS
    const serviceInput =
      document.getElementById(
        "navServiceInput"
      );

    const locationInput =
      document.getElementById(
        "navLocationInput"
      );


    if (serviceInput) {

      serviceInput.value =
        service !== "All Services"
          ? service
          : "";

    }


    if (locationInput) {

      locationInput.value =
        location !== "Nigeria"
          ? location
          : "";

    }


    // APPLY FILTERS
    applyFilters();


    // LOGGED-IN USER
    const user =
      typeof getCurrentUser === "function"
        ? getCurrentUser()
        : null;


    const navActions =
      document.querySelector(
        ".nav-actions"
      );


    if (
      navActions &&
      user
    ) {

      navActions.innerHTML =
        `
          <a
            href="dashboard.html"
            class="btn-ghost"
            style="text-decoration:none"
          >
            Hi,
            ${user.fullName.split(" ")[0]}
            <i class="bi bi-person-circle"></i>
          </a>

          <button
            class="btn-ghost"
            onclick="signOut()"
          >
            Sign Out
          </button>
        `;

    }


    // ENTER KEY
    if (serviceInput) {

      serviceInput.addEventListener(
        "keydown",
        (e) => {

          if (e.key === "Enter") {
            handleSearch();
          }

        }
      );

    }


    if (locationInput) {

      locationInput.addEventListener(
        "keydown",
        (e) => {

          if (e.key === "Enter") {
            handleSearch();
          }

        }
      );

    }

  }
);