// ─── PROFILE PAGE JS ───
// Reads the provider ID from the URL and fills the page dynamically

window.onload = function () {
  // Step 1 — Read the ID from the URL
  const id = new URLSearchParams(window.location.search).get("id");

  // Step 2 — Find the matching provider from data.js
  const provider = providers.find((p) => p.id == id);

  // Step 3 — If no provider found, show not found message
  if (!provider) {
    document.querySelector(".profile-hero").innerHTML = `
      <div class="not-found">
        <h2>Provider Not Found</h2>
        <p>This provider may no longer be available.</p>
        <button class="back-btn" onclick="window.location.href='search.html'">Back to Search</button>
      </div>
    `;
    return;
  }

  // ─── FILL THE PAGE ───

  // Page title
  document.title = provider.name + " — VerifiedNG";

  // Breadcrumb
  document.getElementById("breadcrumbName").textContent = provider.name;

  // Avatar
  const avatar = document.getElementById("providerAvatar");
  avatar.style.background = provider.avatarBg || "#e6f9ee";
  avatar.innerHTML = `
  <img src="${provider.image}" alt="${provider.name}" class="profile-img" />
  <div class="online-dot ${provider.availability}" id="onlineDot"></div>
`;

  // Hero info
  document.getElementById("providerName").textContent = provider.name;
  document.getElementById("providerRole").textContent =
    provider.role + " · " + provider.location;
  document.getElementById("providerRating").textContent = provider.rating;
  document.getElementById("providerReviews").textContent =
    "(" + provider.reviews + " reviews)";
  document.getElementById("providerLocation").textContent = provider.location;
  document.getElementById("providerAvailText").textContent = provider.availText;

  // Hire panel
  document.getElementById("panelAvailText").textContent = provider.availText;
  document.getElementById("panelPrice").textContent = provider.price;
  document.getElementById("panelPer").textContent = provider.per;

  // Stats bar
  document.getElementById("statJobs").innerHTML =
    provider.jobs + "<span>+</span>";
  document.getElementById("statExperience").innerHTML =
    provider.experienceYears;
  document.getElementById("statRating").innerHTML =
    provider.rating + "<span>★</span>";

  // Bio
  document.getElementById("providerBio").textContent = provider.bio;

  // Skills tags
  document.getElementById("providerSkills").innerHTML = provider.skills
    .map((tag) => `<span class="skill-tag">${tag}</span>`)
    .join("");

  // Gallery — use actual gallery
  document.getElementById("providerGallery").innerHTML = provider.gallery
    .map(
      (icon) => `
  <div class="gallery-item">
    <i class="${icon}"></i>
    <div class="overlay">View</div>
  </div>
`,
    )
    .join("");

  // Reviews
  document.getElementById("reviewRating").textContent = provider.rating;
  document.getElementById("reviewCount").textContent =
    provider.reviewCount + " reviews";

  if (provider.reviews?.length) {
    document.getElementById("reviewList").innerHTML = provider.reviews
      .map(
        (r) => `
      <div class="review-card">
        <div class="review-top">
          <div class="reviewer">
            <div class="reviewer-avatar"><i class="${r.avatar}"></div>
            <div class="reviewer-info">
              <div class="r-name">${r.name}</div>
              <div class="r-date">${r.date}</div>
            </div>
          </div>
          <div class="review-stars">${r.stars}</div>
        </div>
        <p class="review-text">${r.text}</p>
        <span class="review-tag">${r.tag}</span>
      </div>
    `,
      )
      .join("");
  }

  // Modal
  document.getElementById("modalTitle").textContent = "Hire " + provider.name;
  document.getElementById("modalServices").innerHTML =
    provider.tags.map((tag) => `<option>${tag}</option>`).join("") +
    "<option>Other</option>";

  // Sidebar
  document.getElementById("sidebarLocation").textContent = provider.location;
  document.getElementById("sidebarAvailability").textContent =
    provider.availText;
  document.getElementById("sidebarJobs").textContent = provider.jobs + "+";
  document.getElementById("sidebarExperience").textContent =
    provider.experience;
  document.getElementById("sidebarRating").textContent = provider.rating + " ★";

  // Experience Stats Bar
  document.getElementById("statExperience").innerHTML =
    provider.experienceYears;
  document.getElementById("sidebarExperience").textContent =
    provider.experienceYears;
  // Similar providers — show 3 others in the same category
  const similar = providers
    .filter((p) => p.category === provider.category && p.id !== provider.id)
    .slice(0, 3);

  if (provider.experience && provider.experience.length > 0) {
    document.getElementById("providerExperience").innerHTML =
      provider.experience
        .map(
          (e) => `
    <div class="exp-item">
      <div class="exp-icon">
  <i class="${e.icon}"></i>
</div>
      <div class="exp-info">
        <h4>${e.title}</h4>
        <p>${e.desc}</p>
        <div class="exp-date">${e.date}</div>
      </div>
    </div>
  `,
        )
        .join("");
  } else {
    document.getElementById("similarList").innerHTML =
      '<p style="font-size:13px;color:var(--mid)">No similar providers found yet.</p>';
  }
};

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

function submitHireRequest() {
  let isValid = true;

  // Full Name
  const name = document.getElementById("hireName").value.trim();
  if (!name) {
    document.getElementById("hireName").classList.add("error");
    document.getElementById("hireNameError").textContent =
      "Please enter your full name";
    document.getElementById("hireNameError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("hireName").classList.remove("error");
    document.getElementById("hireName").classList.add("success");
    document.getElementById("hireNameError").classList.remove("show");
  }

  // Phone
  const phone = document.getElementById("hirePhone").value.trim();
  const phoneValid = /^0[7-9][0-1]\d{8}$/.test(phone);
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
    document.getElementById("hirePhone").classList.add("success");
    document.getElementById("hirePhoneError").classList.remove("show");
  }

  // Service
  const service = document.getElementById("modalServices").value;
  if (!service) {
    document.getElementById("modalServices").classList.add("error");
    document.getElementById("hireServiceError").textContent =
      "Please select a service";
    document.getElementById("hireServiceError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("modalServices").classList.remove("error");
    document.getElementById("modalServices").classList.add("success");
    document.getElementById("hireServiceError").classList.remove("show");
  }

  // Description
  const desc = document.getElementById("hireDescription").value.trim();
  if (!desc) {
    document.getElementById("hireDescription").classList.add("error");
    document.getElementById("hireDescError").textContent =
      "Please describe what you need done";
    document.getElementById("hireDescError").classList.add("show");
    isValid = false;
  } else if (desc.length < 20) {
    document.getElementById("hireDescription").classList.add("error");
    document.getElementById("hireDescError").textContent =
      "Please give a bit more detail — at least 20 characters";
    document.getElementById("hireDescError").classList.add("show");
    isValid = false;
  } else {
    document.getElementById("hireDescription").classList.remove("error");
    document.getElementById("hireDescription").classList.add("success");
    document.getElementById("hireDescError").classList.remove("show");
  }

  if (!isValid) {
    const btn = document.getElementById("hireSubmitBtn");
    btn.style.animation = "none";
    btn.offsetHeight; // trigger reflow
    btn.style.animation = "shake 0.4s ease";
    return;
  }

  // All good — show success
  const btn = document.getElementById("hireSubmitBtn");
  btn.textContent = "Sending Request...";
  btn.style.opacity = "0.7";
  btn.style.pointerEvents = "none";

  setTimeout(() => {
    closeModal();
    alert("Hire request sent! The provider will contact you shortly.");
    // Reset form
    document.getElementById("hireName").value = "";
    document.getElementById("hirePhone").value = "";
    document.getElementById("hireDescription").value = "";
    btn.textContent = "Send Hire Request";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  }, 1500);
}

// UPDATE NAV BASED ON LOGIN STATE
document.addEventListener("DOMContentLoaded", function () {
  const user = getCurrentUser();
  const navActions = document.querySelector(".nav-actions");

  if (navActions) {
    if (user) {
      navActions.innerHTML = `
        <a href="dashboard.html" class="btn-ghost" 
          style="text-decoration:none">
          Hi, ${user.fullName.split(" ")[0]} 👋
        </a>
        <button class="btn-ghost" onclick="signOut()">Sign Out</button>
      `;
    }
  }
});
