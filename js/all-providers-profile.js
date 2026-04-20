// ─── CONTENT GATE ───
(function() {
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  if (!user || !token) {
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;
        justify-content:center;font-family:'DM Sans',sans-serif;
        background:#f8f9ff;">
        <div style="text-align:center;max-width:420px;padding:40px;
          background:white;border-radius:20px;
          box-shadow:0 8px 40px rgba(0,0,0,0.1);">
          <div style="font-size:3rem;margin-bottom:16px;">🔒</div>
          <h2 style="font-family:Syne,sans-serif;color:#1a1a2e;margin-bottom:8px;">
            Sign In to View This Profile
          </h2>
          <p style="color:#666;margin-bottom:24px;font-size:0.95rem;line-height:1.6;">
            Create a free account to view verified provider profiles 
            and hire trusted service providers across Nigeria.
          </p>
          <a href="signup-customer.html" style="display:block;background:#1a1a2e;
            color:white;padding:14px;border-radius:10px;text-decoration:none;
            font-weight:600;margin-bottom:12px;font-size:0.95rem;">
            Create Free Account
          </a>
          <a href="login.html" style="display:block;background:#f5f5f5;
            color:#1a1a2e;padding:14px;border-radius:10px;
            text-decoration:none;font-weight:600;font-size:0.95rem;">
            Log In
          </a>
          <p style="color:#aaa;font-size:0.8rem;margin-top:16px;">
            <a href="index.html" style="color:#1a1a2e;">← Back to Homepage</a>
          </p>
        </div>
      </div>
    `;
    return;
  }
})();

// ─── PROFILE PAGE JS ───

window.onload = async function () {
  const id = new URLSearchParams(window.location.search).get("id");

  // Check if this is a database provider (id starts with "db_")
  if (id && id.startsWith("db_")) {
    await loadDbProvider(id.replace("db_", ""));
  } else {
    // Static provider
    const provider = providers.find((p) => p.id == id);
    if (!provider) {
      showNotFound();
      return;
    }
    renderProvider(provider);
  }
};

// Load provider from database
async function loadDbProvider(mongoId) {
  try {
    const response = await fetch(`${API_URL}/api/providers/${mongoId}`);
    const data = await response.json();

    if (!data.provider) {
      showNotFound();
      return;
    }

    const p = data.provider;

    // Convert DB provider to display format
    const provider = {
      id: "db_" + p._id,
      name: p.fullName,
      role: p.category || "Service Provider",
      category: p.category || "Other",
      icon: getCategoryIconProfile(p.category),
      avatarBg: getAvatarBgProfile(p.category),
      rating: 4.5,
      reviewCount: 0,
      jobs: 0,
      experienceYears: "New",
      location: p.city && p.state ? `${p.city}, ${p.state}` : p.state || "Nigeria",
      availability: "online",
      availText: "Available Now",
      tags: p.skills ? p.skills.slice(0, 3) : [p.category || "Service"],
      bio: p.bio || "Verified service provider on VerifiedNG.",
      price: "₦Talk-Price",
      per: "/job",
      verified: p.isVerified || false,
      reviews: [],
      gallery: [],
      experience: [],
      skills: p.skills || [],
    };

    renderProvider(provider);
  } catch (error) {
    console.log("Could not load provider:", error);
    showNotFound();
  }
}

function getCategoryIconProfile(category) {
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
    Driver: "bi bi-truck"
  };
  return icons[category] || "bi bi-person-workspace";
}

function getAvatarBgProfile(category) {
  const bgs = {
    Plumbing: "#e6f9ee",
    Electrical: "#fffbec",
    "Auto Mechanic": "#eef3ff",
    Tutoring: "#fff8ec",
    Cleaning: "#f0f0ff",
    Photography: "#ffeef3",
    Tailoring: "#ffeef3",
    Catering: "#e6f9ee",
    Programming: "#eef3ff"
  };
  return bgs[category] || "#f5f5f5";
}

function showNotFound() {
  document.querySelector(".profile-hero").innerHTML = `
    <div style="text-align:center;padding:60px 20px;">
      <div style="font-size:3rem;margin-bottom:16px;"><i class="bi bi-person-x"></i></div>
      <h2 style="font-family:Syne,sans-serif;">Provider Not Found</h2>
      <p style="color:#666;">This provider may no longer be available.</p>
      <a href="search.html" style="display:inline-block;margin-top:20px;
        background:#1a1a2e;color:white;padding:12px 24px;border-radius:8px;
        text-decoration:none;font-weight:600;">Back to Search</a>
    </div>
  `;
}

// Extract render logic into separate function
function renderProvider(provider) {
  document.title = provider.name + " — VerifiedNG";
  document.getElementById("breadcrumbName").textContent = provider.name;

  const avatar = document.getElementById("providerAvatar");
  avatar.style.background = provider.avatarBg || "#e6f9ee";
  avatar.innerHTML = `<i class="${provider.icon}" style="font-size:2rem;"></i>
    <div class="online-dot ${provider.availability}" id="onlineDot"></div>`;

  document.getElementById("providerName").textContent = provider.name;
  document.getElementById("providerRole").textContent =
    provider.role + " · " + provider.location;
  document.getElementById("providerRating").textContent = provider.rating;
  document.getElementById("providerReviews").textContent =
    "(" + provider.reviewCount + " reviews)";
  document.getElementById("providerLocation").textContent = provider.location;
  document.getElementById("providerAvailText").textContent = provider.availText;

  document.getElementById("panelAvailText").textContent = provider.availText;
  document.getElementById("panelPrice").textContent = provider.price;
  document.getElementById("panelPer").textContent = provider.per;

  document.getElementById("statJobs").innerHTML = provider.jobs + "<span>+</span>";
  document.getElementById("statExperience").innerHTML = provider.experienceYears;
  document.getElementById("statRating").innerHTML = provider.rating + "<span>★</span>";

  document.getElementById("providerBio").textContent = provider.bio;

  document.getElementById("providerSkills").innerHTML = provider.skills
    .map((tag) => `<span class="skill-tag">${tag}</span>`)
    .join("") || "<p style='color:#888;font-size:0.9rem;'>Skills not listed yet.</p>";

  document.getElementById("providerGallery").innerHTML = provider.gallery.length
    ? provider.gallery.map((icon) => `
        <div class="gallery-item">
          <i class="${icon}"></i>
          <div class="overlay">View</div>
        </div>`).join("")
    : "<p style='color:#888;font-size:0.9rem;'>No gallery photos yet.</p>";

  document.getElementById("reviewRating").textContent = provider.rating;
  document.getElementById("reviewCount").textContent = provider.reviewCount + " reviews";

  if (provider.reviews && provider.reviews.length) {
    document.getElementById("reviewList").innerHTML = provider.reviews
      .map((r) => `
        <div class="review-card">
          <div class="review-top">
            <div class="reviewer">
              <div class="reviewer-avatar"><i class="${r.avatar}"></i></div>
              <div class="reviewer-info">
                <div class="r-name">${r.name}</div>
                <div class="r-date">${r.date}</div>
              </div>
            </div>
            <div class="review-stars">${r.stars}</div>
          </div>
          <p class="review-text">${r.text}</p>
          <span class="review-tag">${r.tag}</span>
        </div>`).join("");
  }

  document.getElementById("modalTitle").textContent = "Hire " + provider.name;
  document.getElementById("modalServices").innerHTML =
    provider.tags.map((tag) => `<option>${tag}</option>`).join("") +
    "<option>Other</option>";

  document.getElementById("sidebarLocation").textContent = provider.location;
  document.getElementById("sidebarAvailability").textContent = provider.availText;
  document.getElementById("sidebarJobs").textContent = provider.jobs + "+";
  document.getElementById("sidebarExperience").textContent = provider.experienceYears;
  document.getElementById("sidebarRating").textContent = provider.rating + " ★";

  if (provider.experience && provider.experience.length > 0) {
    document.getElementById("providerExperience").innerHTML =
      provider.experience.map((e) => `
        <div class="exp-item">
          <div class="exp-icon"><i class="${e.icon}"></i></div>
          <div class="exp-info">
            <h4>${e.title}</h4>
            <p>${e.desc}</p>
            <div class="exp-date">${e.date}</div>
          </div>
        </div>`).join("");
  } else {
    document.getElementById("providerExperience").innerHTML =
      "<p style='color:#888;font-size:0.9rem;'>No experience listed yet.</p>";
  }

  // Similar providers
  const similar = providers
    .filter((p) => p.category === provider.category && p.id !== provider.id)
    .slice(0, 3);

  document.getElementById("similarList").innerHTML = similar.length
    ? similar.map((p) => `
        <div onclick="window.location.href='all-providers-profile.html?id=${p.id}'"
          style="cursor:pointer;display:flex;align-items:center;gap:10px;
          padding:8px 0;border-bottom:1px solid #f0f0f0;">
          <div style="width:36px;height:36px;border-radius:50%;background:${p.avatarBg};
            display:flex;align-items:center;justify-content:center;font-size:1rem;">
            <i class="${p.icon}"></i>
          </div>
          <div>
            <div style="font-weight:600;font-size:0.85rem;">${p.name}</div>
            <div style="font-size:0.75rem;color:#888;">${p.rating} ★ · ${p.jobs}+ jobs</div>
          </div>
        </div>`).join("")
    : "<p style='font-size:13px;color:#888;'>No similar providers found yet.</p>";
}

// ─── MODAL ───
function openModal() {
  document.getElementById("hireModal").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("hireModal").classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("hireModal");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });
  }

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
});

// ─── SHARE BUTTONS ───
function shareWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const name = document.getElementById("providerName").textContent;
  window.open(`https://wa.me/?text=Check out ${name} on VerifiedNG: ${url}`);
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  alert("Link copied to clipboard!");
}

function shareTwitter() {
  const url = encodeURIComponent(window.location.href);
  window.open(
    `https://twitter.com/intent/tweet?url=${url}&text=Found a great provider on VerifiedNG!`,
  );
}

// ─── HIRE REQUEST ───
function submitHireRequest() {
  let isValid = true;

  const name = document.getElementById("hireName").value.trim();
  const phone = document.getElementById("hirePhone").value.trim();
  const service = document.getElementById("modalServices").value;
  const desc = document.getElementById("hireDescription").value.trim();
  const phoneValid = /^0[7-9][0-1]\d{8}$/.test(phone);

  if (!name) {
    document.getElementById("hireName").classList.add("error");
    document.getElementById("hireNameError").textContent =
      "Please enter your full name";
    document.getElementById("hireNameError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("hireName").classList.remove("error");
    document.getElementById("hireNameError").classList.remove("show");
  }

  if (!phone) {
    document.getElementById("hirePhone").classList.add("error");
    document.getElementById("hirePhoneError").textContent =
      "Please enter your phone number";
    document.getElementById("hirePhoneError").classList.add("show");
    isValid = false;
  } else if (!phoneValid) {
    document.getElementById("hirePhone").classList.add("error");
    document.getElementById("hirePhoneError").textContent =
      "Enter a valid Nigerian number e.g. 08012345678";
    document.getElementById("hirePhoneError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("hirePhone").classList.remove("error");
    document.getElementById("hirePhoneError").classList.remove("show");
  }

  if (!desc || desc.length < 20) {
    document.getElementById("hireDescription").classList.add("error");
    document.getElementById("hireDescError").textContent = desc
      ? "Please give a bit more detail — at least 20 characters"
      : "Please describe what you need done";
    document.getElementById("hireDescError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("hireDescription").classList.remove("error");
    document.getElementById("hireDescError").classList.remove("show");
  }

  if (!isValid) return;

  const btn = document.getElementById("modalSubmitBtn");
  btn.textContent = "Sending...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  // Get provider info from the page
  const providerName = document.getElementById("providerName").textContent;
  const urlParams = new URLSearchParams(window.location.search);
  const providerId = urlParams.get("id") || "static";

  fetch(`${API_URL}/api/hire`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      providerName,
      providerId,
      customerName: name,
      customerPhone: phone,
      serviceNeeded: service,
      description: desc,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.request || data.message === "Hire request sent successfully!") {
        closeModal();
        // Show success message on page instead of alert
        const successBanner = document.createElement("div");
        successBanner.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #00c853; color: white; padding: 16px 24px;
        border-radius: 10px; font-family: DM Sans, sans-serif;
        font-size: 0.95rem; box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
      `;
        successBanner.innerHTML = `<i class="bi bi-check-circle"></i> Hire request sent! The provider will contact you shortly.`;
        document.body.appendChild(successBanner);
        setTimeout(() => successBanner.remove(), 4000);

        // Reset form
        document.getElementById("hireName").value = "";
        document.getElementById("hirePhone").value = "";
        document.getElementById("hireDescription").value = "";
      } else {
        document.getElementById("hireDescError").textContent =
          data.message || "Something went wrong";
        document.getElementById("hireDescError").classList.add("show");
      }

      btn.textContent = "Send Hire Request";
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    })
    .catch(() => {
      document.getElementById("hireDescError").textContent =
        "Something went wrong. Try again.";
      document.getElementById("hireDescError").classList.add("show");
      btn.textContent = "Send Hire Request";
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    });
}
