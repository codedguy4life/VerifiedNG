```javascript
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


// ─────────────────────────────────────────────
// CATEGORY NORMALIZATION
// ─────────────────────────────────────────────

function canonicalCategory(value) {
  const text = normalizeSearchText(value);

  if (!text) return "";

  const databaseCategories = [
    "Electrical",
    "Plumbing",
    "Tutoring",
    "Auto Mechanic",
    "Cleaning",
    "Photography",
    "Tailoring",
    "Catering",
    "Programming",
    "ContentCreator",
    "Graphic Designer",
    "Carpenter",
    "Painter",
    "Driver"
  ];

  for (const category of databaseCategories) {
    if (normalizeSearchText(category) === text) {
      return normalizeSearchText(category);
    }
  }

  for (const [category, aliases] of Object.entries(serviceAliases)) {
    const normalizedCategory =
      normalizeSearchText(category);

    if (normalizedCategory === text) {
      return normalizedCategory;
    }

    if (
      aliases.some(
        (alias) => normalizeSearchText(alias) === text
      )
    ) {
      return normalizedCategory;
    }
  }

  return text;
}


// ─────────────────────────────────────────────
// CATEGORY DISPLAY NAMES
// ─────────────────────────────────────────────

function getCategoryDisplayName(category) {
  const names = {
    Electrical: "Electrician",
    Plumbing: "Plumber",
    Tutoring: "Tutor",
    "Auto Mechanic": "Mechanic",
    Cleaning: "Cleaner",
    Photography: "Photographer",
    Tailoring: "Tailor",
    Catering: "Caterer",
    Programming: "Programmer",
    ContentCreator: "Content Creator",
    "Graphic Designer": "Graphic Designer",
    Carpenter: "Carpenter",
    Painter: "Painter",
    Driver: "Driver"
  };

  return names[category] || category;
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

  const location = normalizeSearchText(
    [
      provider.location,
      provider.locationKey,
      provider.state,
      provider.city
    ].join(" ")
  );

  const locationAliases = {
    abuja: [
      "abuja",
      "fct",
      "federal capital territory"
    ],

    fct: [
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
    ],

    warri: [
      "warri",
      "delta"
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
      We intentionally don't send category/location
      filters here.

      We load the available providers first and let
      the frontend filters work with the real data.
    */

    const url = `${API_URL}/api/providers`;

    console.log("Loading providers:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const data = await response.json();

    providers.length = 0;

    if (
      !data.providers ||
      data.providers.length === 0
    ) {
      console.log("No providers returned from backend.");
      return;
    }

    const dbProviders = data.providers.map((p) => ({
      id: "db_" + p._id,
      dbId: p._id,

      name: p.fullName || "Verified Provider",

      role:
        p.category ||
        "Service Provider",

      category:
        p.category ||
        "Other",

      icon:
        getCategoryIcon(p.category),

      avatarBg:
        getAvatarBg(p.category),

      rating:
        Number(p.rating) || 0,

      reviewCount:
        Number(p.reviewCount) || 0,

      jobs:
        Number(p.jobs) || 0,

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

      city:
        p.city || "",

      state:
        p.state || "",

      availability:
        p.availability || "unknown",

      availText:
        getAvailabilityText(
          p.availability
        ),

      tags:
        Array.isArray(p.skills) &&
        p.skills.length > 0
          ? p.skills.slice(0, 3)
          : [
              p.category ||
              "Service"
            ],

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
        p.isVerified ||
        false,

      reviews: [],

      gallery: [],

      experience: [],

      skills:
        Array.isArray(p.skills)
          ? p.skills
          : [],

      createdAt:
        p.createdAt || null
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
// AVAILABILITY TEXT
// ─────────────────────────────────────────────

function getAvailabilityText(value) {
  switch (value) {
    case "online":
    case "available":
      return "Available Now";

    case "weekend":
      return "Available Weekends";

    case "24hr":
      return "Available 24/7";

    default:
      return "Availability not set";
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
      "#eef3ff",

    ContentCreator:
      "#ffeef3"
  };

  return (
    bgs[category] ||
    "#f5f5f5"
  );
}


// ─────────────────────────────────────────────
// URL PARAMETERS
// ─────────────────────────────────────────────

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
// BUILD CATEGORY FILTER
// ─────────────────────────────────────────────

function buildCategoryFilter() {
  const container =
    document.getElementById(
      "categoryFilter"
    );

  if (!container) return;

  const categoryCounts = {};

  providers.forEach((provider) => {
    if (!provider.category) return;

    const category =
      provider.category;

    categoryCounts[category] =
      (categoryCounts[category] || 0) + 1;
  });

  container.replaceChildren();

  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(
      ([category, count]) => {
        const label =
          document.createElement(
            "label"
          );

        label.className =
          "filter-option";

        const input =
          document.createElement(
            "input"
          );

        input.type = "checkbox";
        input.value = category;
        input.addEventListener(
          "change",
          applyFilters
        );

        const categoryText =
          document.createTextNode(
            getCategoryDisplayName(category)
          );

        const countElement =
          document.createElement(
            "span"
          );

        countElement.className =
          "filter-count";

        countElement.textContent =
          String(count);

        label.appendChild(input);
        label.appendChild(categoryText);
        label.appendChild(countElement);

        container.appendChild(label);
      }
    );
}


// ─────────────────────────────────────────────
// BUILD LOCATION FILTER
// ─────────────────────────────────────────────

function buildLocationFilter() {
  const container =
    document.getElementById(
      "locationFilter"
    );

  if (!container) return;

  const locationCounts = {};

  providers.forEach((provider) => {
    const location =
      provider.state ||
      provider.city;

    if (!location) return;

    const displayLocation =
      location.trim();

    locationCounts[
      displayLocation
    ] =
      (locationCounts[
        displayLocation
      ] || 0) + 1;
  });

  container.replaceChildren();

  Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(
      ([location, count]) => {
        const label =
          document.createElement(
            "label"
          );

        label.className =
          "filter-option";

        const input =
          document.createElement(
            "input"
          );

        input.type = "checkbox";
        input.value = location;
        input.addEventListener(
          "change",
          applyFilters
        );

        const locationText =
          document.createTextNode(
            location
          );

        const countElement =
          document.createElement(
            "span"
          );

        countElement.className =
          "filter-count";

        countElement.textContent =
          String(count);

        label.appendChild(input);
        label.appendChild(locationText);
        label.appendChild(countElement);

        container.appendChild(label);
      }
    );
}


// ─────────────────────────────────────────────
// BUILD BOTH FILTERS
// ─────────────────────────────────────────────

function buildDynamicFilters() {
  buildCategoryFilter();
  buildLocationFilter();
}


// ─────────────────────────────────────────────
// FILTER COUNTS
// ─────────────────────────────────────────────

function updateFilterCounts(filteredProviders) {
  const categoryCounts = {};
  const locationCounts = {};

  filteredProviders.forEach(
    (provider) => {
      if (provider.category) {
        categoryCounts[
          provider.category
        ] =
          (categoryCounts[
            provider.category
          ] || 0) + 1;
      }

      const location =
        provider.state ||
        provider.city;

      if (location) {
        locationCounts[
          location
        ] =
          (locationCounts[
            location
          ] || 0) + 1;
      }
    }
  );

  document
    .querySelectorAll(
      "#categoryFilter .filter-option"
    )
    .forEach((label) => {
      const input =
        label.querySelector(
          "input"
        );

      const countElement =
        label.querySelector(
          ".filter-count"
        );

      if (!input || !countElement)
        return;

      const category =
        input.value;

      countElement.textContent =
        categoryCounts[
          category
        ] || 0;
    });

  document
    .querySelectorAll(
      "#locationFilter .filter-option"
    )
    .forEach((label) => {
      const input =
        label.querySelector(
          "input"
        );

      const countElement =
        label.querySelector(
          ".filter-count"
        );

      if (!input || !countElement)
        return;

      const location =
        input.value;

      countElement.textContent =
        locationCounts[
          location
        ] || 0;
    });
}


// ─────────────────────────────────────────────
// SERVICE MATCHING
// ─────────────────────────────────────────────

function matchesService(
  provider,
  service
) {
  const query =
    normalizeSearchText(
      service
    );

  if (
    !query ||
    query === "all services"
  ) {
    return true;
  }

  const canonical =
    canonicalCategory(
      service
    );

  const providerCategory =
    canonicalCategory(
      provider.category
    );

  if (
    providerCategory ===
    canonical
  ) {
    return true;
  }

  const providerText =
    normalizeSearchText(
      [
        provider.name,
        provider.category,
        provider.role,
        provider.bio,
        ...(provider.skills || [])
      ].join(" ")
    );

  if (
    providerText.includes(query)
  ) {
    return true;
  }

  const aliases =
    serviceAliases[
      canonical
    ] || [];

  return aliases.some(
    (alias) =>
      providerText.includes(
        normalizeSearchText(
          alias
        )
      )
  );
}


// ─────────────────────────────────────────────
// AVAILABILITY MATCHING
// ─────────────────────────────────────────────

function matchesAvailability(
  provider,
  requested
) {
  if (!requested) {
    return true;
  }

  return (
    provider.availability ===
      requested ||
    (
      requested === "available" &&
      provider.availability ===
        "online"
    )
  );
}


// ─────────────────────────────────────────────
// CREATE TEXT ELEMENT
// ─────────────────────────────────────────────

function createTextElement(
  tagName,
  className,
  text
) {
  const element =
    document.createElement(
      tagName
    );

  if (className) {
    element.className =
      className;
  }

  element.textContent =
    String(text ?? "");

  return element;
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

  const resultCount =
    document.getElementById(
      "resultCount"
    );

  if (resultCount) {
    resultCount.textContent =
      String(list.length);
  }

  grid.replaceChildren();

  if (list.length === 0) {
    const noResults =
      document.createElement(
        "div"
      );

    noResults.className =
      "no-results";

    const iconWrapper =
      document.createElement(
        "div"
      );

    iconWrapper.className =
      "nr-icon";

    const icon =
      document.createElement(
        "i"
      );

    icon.className =
      "bi bi-search";

    iconWrapper.appendChild(
      icon
    );

    const heading =
      createTextElement(
        "h3",
        null,
        "No providers found"
      );

    const paragraph =
      createTextElement(
        "p",
        null,
        "Try a broader service name, another location, or remove a filter."
      );

    noResults.appendChild(
      iconWrapper
    );

    noResults.appendChild(
      heading
    );

    noResults.appendChild(
      paragraph
    );

    grid.appendChild(
      noResults
    );

    return;
  }

  list.forEach(
    (p, i) => {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "provider-card";

      card.style.animationDelay =
        `${i * 0.07}s`;

      card.addEventListener(
        "click",
        () => {
          window.location.href =
            `all-providers-profile.html?id=${encodeURIComponent(p.id)}`;
        }
      );


      // ───────── CARD TOP ─────────

      const cardTop =
        document.createElement(
          "div"
        );

      cardTop.className =
        "card-top";


      const avatar =
        document.createElement(
          "div"
        );

      avatar.className =
        "card-avatar";

      avatar.style.background =
        p.avatarBg;

      const avatarIcon =
        document.createElement(
          "i"
        );

      avatarIcon.className =
        p.icon;

      avatar.appendChild(
        avatarIcon
      );


      const cardInfo =
        document.createElement(
          "div"
        );

      cardInfo.className =
        "card-info";


      // Name row

      const nameRow =
        document.createElement(
          "div"
        );

      nameRow.className =
        "card-name-row";

      const name =
        createTextElement(
          "span",
          "card-name",
          p.name
        );

      nameRow.appendChild(
        name
      );

      if (p.verified) {
        const verified =
          document.createElement(
            "span"
          );

        verified.className =
          "verified-pill";

        const verifiedIcon =
          document.createElement(
            "i"
          );

        verifiedIcon.className =
          "bi bi-patch-check";

        verified.appendChild(
          verifiedIcon
        );

        verified.appendChild(
          document.createTextNode(
            " Verified"
          )
        );

        nameRow.appendChild(
          verified
        );
      }


      // Role

      const role =
        createTextElement(
          "div",
          "card-role",
          p.role
        );


      // Rating

      const rating =
        document.createElement(
          "div"
        );

      rating.className =
        "card-rating";

      const stars =
        createTextElement(
          "span",
          "stars",
          "★★★★★"
        );

      const score =
        createTextElement(
          "span",
          "score",
          p.rating > 0
            ? p.rating
            : "New"
        );

      rating.appendChild(
        stars
      );

      rating.appendChild(
        score
      );

      if (p.reviewCount > 0) {
        const reviews =
          createTextElement(
            "span",
            "reviews",
            `(${p.reviewCount} reviews)`
          );

        rating.appendChild(
          reviews
        );
      }


      // Location

      const cardLocation =
        document.createElement(
          "div"
        );

      cardLocation.className =
        "card-location";

      const locationIcon =
        document.createElement(
          "i"
        );

      locationIcon.className =
        "bi bi-geo-alt-fill";

      cardLocation.appendChild(
        locationIcon
      );

      cardLocation.appendChild(
        document.createTextNode(
          ` ${String(p.location ?? "")}`
        )
      );


      cardInfo.appendChild(
        nameRow
      );

      cardInfo.appendChild(
        role
      );

      cardInfo.appendChild(
        rating
      );

      cardInfo.appendChild(
        cardLocation
      );


      cardTop.appendChild(
        avatar
      );

      cardTop.appendChild(
        cardInfo
      );


      // ───────── CARD BODY ─────────

      const cardBody =
        document.createElement(
          "div"
        );

      cardBody.className =
        "card-body";


      // Tags

      const cardTags =
        document.createElement(
          "div"
        );

      cardTags.className =
        "card-tags";

      (p.tags || []).forEach(
        (tag) => {
          const tagElement =
            createTextElement(
              "span",
              "tag",
              tag
            );

          cardTags.appendChild(
            tagElement
          );
        }
      );


      // Bio

      const cardBio =
        document.createElement(
          "p"
        );

      cardBio.className =
        "card-bio";

      const bio =
        String(
          p.bio || ""
        );

      cardBio.textContent =
        bio.length > 120
          ? `${bio.substring(0, 120)}...`
          : bio;


      // Stats

      const cardStats =
        document.createElement(
          "div"
        );

      cardStats.className =
        "card-stats";


      // Jobs

      const jobsBox =
        document.createElement(
          "div"
        );

      jobsBox.className =
        "cs-box";

      const jobsValue =
        document.createElement(
          "div"
        );

      jobsValue.className =
        "cs-val";

      if (p.jobs > 0) {
        jobsValue.appendChild(
          document.createTextNode(
            String(p.jobs)
          )
        );

        const sup =
          document.createElement(
            "sup"
          );

        sup.textContent =
          "+";

        jobsValue.appendChild(
          sup
        );
      } else {
        jobsValue.textContent =
          "—";
      }

      const jobsLabel =
        createTextElement(
          "div",
          "cs-label",
          "Jobs Done"
        );

      jobsBox.appendChild(
        jobsValue
      );

      jobsBox.appendChild(
        jobsLabel
      );


      // Experience

      const experienceBox =
        document.createElement(
          "div"
        );

      experienceBox.className =
        "cs-box";

      const experienceValue =
        createTextElement(
          "div",
          "cs-val",
          p.experienceYears
        );

      const experienceLabel =
        createTextElement(
          "div",
          "cs-label",
          "Experience"
        );

      experienceBox.appendChild(
        experienceValue
      );

      experienceBox.appendChild(
        experienceLabel
      );


      // Rating

      const ratingBox =
        document.createElement(
          "div"
        );

      ratingBox.className =
        "cs-box";

      const ratingValue =
        createTextElement(
          "div",
          "cs-val",
          p.rating > 0
            ? `${p.rating}★`
            : "New"
        );

      const ratingLabel =
        createTextElement(
          "div",
          "cs-label",
          "Rating"
        );

      ratingBox.appendChild(
        ratingValue
      );

      ratingBox.appendChild(
        ratingLabel
      );


      cardStats.appendChild(
        jobsBox
      );

      cardStats.appendChild(
        experienceBox
      );

      cardStats.appendChild(
        ratingBox
      );


      cardBody.appendChild(
        cardTags
      );

      cardBody.appendChild(
        cardBio
      );

      cardBody.appendChild(
        cardStats
      );


      // ───────── CARD FOOTER ─────────

      const cardFooter =
        document.createElement(
          "div"
        );

      cardFooter.className =
        "card-footer";


      // Price

      const priceInfo =
        document.createElement(
          "div"
        );

      priceInfo.className =
        "price-info";

      const from =
        createTextElement(
          "div",
          "from",
          "Starting price"
        );

      const amount =
        createTextElement(
          "span",
          "amount",
          p.price
        );

      const per =
        createTextElement(
          "span",
          "per",
          p.per
        );

      priceInfo.appendChild(
        from
      );

      priceInfo.appendChild(
        amount
      );

      priceInfo.appendChild(
        per
      );


      // Footer actions area

      const footerRight =
        document.createElement(
          "div"
        );

      footerRight.style.display =
        "flex";

      footerRight.style.flexDirection =
        "column";

      footerRight.style.alignItems =
        "flex-end";

      footerRight.style.gap =
        "6px";


      // Availability

      const availabilityText =
        document.createElement(
          "div"
        );

      availabilityText.className =
        "avail-text";

      const availabilityDot =
        document.createElement(
          "span"
        );

      availabilityDot.className =
        `avail-dot ${p.availability}`;

      const availabilityLabel =
        createTextElement(
          "span",
          null,
          p.availText
        );

      availabilityText.appendChild(
        availabilityDot
      );

      availabilityText.appendChild(
        availabilityLabel
      );


      // Card actions

      const cardActions =
        document.createElement(
          "div"
        );

      cardActions.className =
        "card-actions";


      // Message button

      const messageButton =
        document.createElement(
          "button"
        );

      messageButton.className =
        "btn-msg";

      messageButton.type =
        "button";

      messageButton.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();
        }
      );

      const messageIcon =
        document.createElement(
          "i"
        );

      messageIcon.className =
        "bi bi-chat-dots";

      messageButton.appendChild(
        messageIcon
      );

      messageButton.appendChild(
        document.createTextNode(
          " Message"
        )
      );


      // Hire button

      const hireButton =
        document.createElement(
          "button"
        );

      hireButton.className =
        "btn-hire";

      hireButton.type =
        "button";

      hireButton.addEventListener(
        "click",
        (event) => {
          event.stopPropagation();

          window.location.href =
            `all-providers-profile.html?id=${encodeURIComponent(p.id)}`;
        }
      );

      hireButton.textContent =
        "Hire Now";


      cardActions.appendChild(
        messageButton
      );

      cardActions.appendChild(
        hireButton
      );


      footerRight.appendChild(
        availabilityText
      );

      footerRight.appendChild(
        cardActions
      );


      cardFooter.appendChild(
        priceInfo
      );

      cardFooter.appendChild(
        footerRight
      );


      // ───────── FINISH CARD ─────────

      card.appendChild(
        cardTop
      );

      card.appendChild(
        cardBody
      );

      card.appendChild(
        cardFooter
      );

      grid.appendChild(
        card
      );
    }
  );
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


  // ───────── SERVICE SEARCH ─────────

  if (
    service &&
    service !== "All Services"
  ) {
    filtered =
      filtered.filter(
        (provider) =>
          matchesService(
            provider,
            service
          )
      );
  }


  // ───────── URL LOCATION ─────────

  if (
    location &&
    location !== "Nigeria"
  ) {
    filtered =
      filtered.filter(
        (provider) =>
          matchesLocation(
            provider,
            location
          )
      );
  }


  // ───────── CATEGORY FILTER ─────────

  const checkedCategories =
    [
      ...document.querySelectorAll(
        "#categoryFilter input:checked"
      )
    ].map(
      (input) =>
        input.value
    );

  if (
    checkedCategories.length
  ) {
    filtered =
      filtered.filter(
        (provider) =>
          checkedCategories.some(
            (category) =>
              canonicalCategory(
                provider.category
              ) ===
              canonicalCategory(
                category
              )
          )
      );
  }


  // ───────── LOCATION FILTER ─────────

  const checkedLocations =
    [
      ...document.querySelectorAll(
        "#locationFilter input:checked"
      )
    ].map(
      (input) =>
        input.value
    );

  if (
    checkedLocations.length
  ) {
    filtered =
      filtered.filter(
        (provider) =>
          checkedLocations.some(
            (location) =>
              matchesLocation(
                provider,
                location
              )
          )
      );
  }


  // ───────── RATING ─────────

  const minRating =
    parseFloat(
      document.querySelector(
        'input[name="rating"]:checked'
      )?.value || 0
    );

  if (minRating > 0) {
    filtered =
      filtered.filter(
        (provider) =>
          provider.rating >=
          minRating
      );
  }


  // ───────── AVAILABILITY ─────────

  const checkedAvailability =
    [
      ...document.querySelectorAll(
        '.filter-group input[type="checkbox"]'
      )
    ]
    .filter(
      (input) =>
        [
          "available",
          "weekend",
          "24hr"
        ].includes(
          input.value
        ) &&
        input.checked
    )
    .map(
      (input) =>
        input.value
    );

  if (
    checkedAvailability.length
  ) {
    filtered =
      filtered.filter(
        (provider) =>
          checkedAvailability.some(
            (availability) =>
              matchesAvailability(
                provider,
                availability
              )
          )
      );
  }


  // ───────── SORT ─────────

  const sortBy =
    document.getElementById(
      "sortSelect"
    )?.value;


  if (
    sortBy === "rating"
  ) {
    filtered.sort(
      (a, b) =>
        b.rating -
        a.rating
    );
  }


  if (
    sortBy === "jobs"
  ) {
    filtered.sort(
      (a, b) =>
        b.jobs -
        a.jobs
    );
  }


  if (
    sortBy === "newest"
  ) {
    filtered.sort(
      (a, b) => {
        const dateA =
          a.createdAt
            ? new Date(
                a.createdAt
              ).getTime()
            : 0;

        const dateB =
          b.createdAt
            ? new Date(
                b.createdAt
              ).getTime()
            : 0;

        return dateB - dateA;
      }
    );
  }


  // Update sidebar numbers

  updateFilterCounts(
    filtered
  );

  // Display providers

  renderCards(
    filtered
  );
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
      (checkbox) => {
        checkbox.checked =
          false;
      }
    );

  const anyRating =
    document.querySelector(
      'input[name="rating"][value="0"]'
    );

  if (anyRating) {
    anyRating.checked =
      true;
  }

  applyFilters();
}


// ─────────────────────────────────────────────
// VIEW TOGGLE
// ─────────────────────────────────────────────

let currentView = "grid";

function setView(
  view,
  btn
) {
  currentView =
    view;

  const grid =
    document.getElementById(
      "resultsGrid"
    );

  document
    .querySelectorAll(
      ".view-btn"
    )
    .forEach(
      (button) =>
        button.classList.remove(
          "active"
        )
    );

  btn.classList.add(
    "active"
  );

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

  if (
    !service &&
    !location
  ) {
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

  params.delete(
    "service"
  );

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

  params.delete(
    "location"
  );

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

  const sidebar =
    document.getElementById(
      "sidebarFilters"
    );

  if (
    !content ||
    !sidebar
  ) {
    return;
  }

  content.innerHTML =
    sidebar.innerHTML;

  document
    .getElementById(
      "filterOverlay"
    )
    .classList.add(
      "open"
    );

  document
    .getElementById(
      "filterDrawer"
    )
    .classList.add(
      "open"
    );
}


function closeFilters() {
  document
    .getElementById(
      "filterOverlay"
    )
    .classList.remove(
      "open"
    );

  document
    .getElementById(
      "filterDrawer"
    )
    .classList.remove(
      "open"
    );
}


// ─────────────────────────────────────────────
// PAGE LOAD
// ─────────────────────────────────────────────

window.addEventListener(
  "load",
  async function () {

    // 1. Load real providers

    await loadRealProviders();


    // 2. Build filters from real data

    buildDynamicFilters();


    // 3. Get URL search values

    const {
      service,
      location
    } = getUrlParams();


    // ───────── SEARCH TITLE ─────────

    const searchDisplay =
      document.getElementById(
        "searchTermDisplay"
      );

    if (searchDisplay) {
      searchDisplay.textContent =
        `"${service}"`;
    }


    // ───────── LOCATION DISPLAY ─────────

    const locationDisplay =
      document.getElementById(
        "locationDisplay"
      );

    if (locationDisplay) {
      locationDisplay.replaceChildren();

      const icon =
        document.createElement(
          "i"
        );

      icon.className =
        "bi bi-geo-alt-fill";

      locationDisplay.appendChild(
        icon
      );

      locationDisplay.appendChild(
        document.createTextNode(
          ` ${location}`
        )
      );
    }


    // ───────── SERVICE TAG ─────────

    const serviceTag =
      document.getElementById(
        "activeServiceTag"
      );

    if (serviceTag) {
      serviceTag.replaceChildren();

      const icon =
        document.createElement(
          "i"
        );

      icon.className =
        "bi bi-tools";

      const serviceText =
        document.createTextNode(
          ` ${service}`
        );

      const removeButton =
        document.createElement(
          "button"
        );

      removeButton.type =
        "button";

      removeButton.textContent =
        "✕";

      removeButton.addEventListener(
        "click",
        removeServiceFilter
      );

      serviceTag.appendChild(
        icon
      );

      serviceTag.appendChild(
        serviceText
      );

      serviceTag.appendChild(
        removeButton
      );

      serviceTag.style.display =
        service !==
        "All Services"
          ? "inline-flex"
          : "none";
    }


    // ───────── LOCATION TAG ─────────

    const locTag =
      document.getElementById(
        "activeLocationTag"
      );

    if (locTag) {
      locTag.replaceChildren();

      const icon =
        document.createElement(
          "i"
        );

      icon.className =
        "bi bi-geo-alt";

      const locationText =
        document.createTextNode(
          ` ${location}`
        );

      const removeButton =
        document.createElement(
          "button"
        );

      removeButton.type =
        "button";

      removeButton.textContent =
        "✕";

      removeButton.addEventListener(
        "click",
        removeLocationFilter
      );

      locTag.appendChild(
        icon
      );

      locTag.appendChild(
        locationText
      );

      locTag.appendChild(
        removeButton
      );

      locTag.style.display =
        location !== "Nigeria"
          ? "inline-flex"
          : "none";
    }


    // ───────── SEARCH INPUTS ─────────

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
        service !==
        "All Services"
          ? service
          : "";
    }

    if (locationInput) {
      locationInput.value =
        location !==
        "Nigeria"
          ? location
          : "";
    }


    // 4. Apply filters ONCE

    applyFilters();


    // ───────── LOGGED-IN USER ─────────

    const user =
      typeof getCurrentUser ===
      "function"
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
      navActions.replaceChildren();

      const dashboardLink =
        document.createElement(
          "a"
        );

      dashboardLink.href =
        "dashboard.html";

      dashboardLink.className =
        "btn-ghost";

      dashboardLink.style.textDecoration =
        "none";

      const firstName =
        String(
          user.fullName || ""
        )
          .trim()
          .split(/\s+/)[0] ||
        "User";

      dashboardLink.appendChild(
        document.createTextNode(
          `Hi, ${firstName} `
        )
      );

      const personIcon =
        document.createElement(
          "i"
        );

      personIcon.className =
        "bi bi-person-circle";

      dashboardLink.appendChild(
        personIcon
      );


      const signOutButton =
        document.createElement(
          "button"
        );

      signOutButton.className =
        "btn-ghost";

      signOutButton.type =
        "button";

      signOutButton.textContent =
        "Sign Out";

      signOutButton.addEventListener(
        "click",
        () => {
          signOut();
        }
      );


      navActions.appendChild(
        dashboardLink
      );

      navActions.appendChild(
        signOutButton
      );
    }


    // ───────── ENTER KEY ─────────

    if (serviceInput) {
      serviceInput.addEventListener(
        "keydown",
        (e) => {
          if (
            e.key ===
            "Enter"
          ) {
            handleSearch();
          }
        }
      );
    }

    if (locationInput) {
      locationInput.addEventListener(
        "keydown",
        (e) => {
          if (
            e.key ===
            "Enter"
          ) {
            handleSearch();
          }
        }
      );
    }
  }
);
```
