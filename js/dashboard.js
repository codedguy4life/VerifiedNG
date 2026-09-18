// PROTECTED — redirects to login if not logged in
const user = checkAuth();

if (user) {
  // ─── FILL USER INFO ───
  document.getElementById("firstName").textContent =
    user.fullName.split(" ")[0];
  document.getElementById("navGreeting").textContent =
    "Hi, " + user.fullName.split(" ")[0];
  document.getElementById("userFullName").textContent = user.fullName;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userRole").textContent =
    user.role === "customer" ? "Customer" : "Service Provider";

  // ─── AVATAR ───
  const avatarEl = document.getElementById("userAvatar");
  if (user.profilePhoto && user.profilePhoto.startsWith("data:")) {
    // Show real photo
    avatarEl.style.backgroundImage = `url(${user.profilePhoto})`;
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
    avatarEl.textContent = "";
  } else {
    // Show initials
    const parts = user.fullName.split(" ");
    const initials = parts[0][0] + (parts[1] ? parts[1][0] : "");
    avatarEl.textContent = initials.toUpperCase();
  }

  // ─── STATS ───
  document.getElementById("loginCount").textContent = user.loginCount || 1;

  // Days as member
  if (user.createdAt) {
    const joined = new Date(user.createdAt);
    const today = new Date();
    const days = Math.floor((today - joined) / (1000 * 60 * 60 * 24));
    document.getElementById("memberDays").textContent = days || 1;
  }

  // ─── CUSTOMER SENT REQUESTS ───
  if (user.role === "customer") {
    const sentRequestsCard = document.getElementById("sentRequestsCard");
    const sentRequestsList = document.getElementById("sentRequestsList");

    if (sentRequestsCard) sentRequestsCard.style.display = "block";

    const token = localStorage.getItem("token");

    fetch(`${API_URL}/api/hire/sent`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load sent requests");
        }

        return data;
      })
      .then((data) => {
        if (!data.requests || data.requests.length === 0) {
          sentRequestsList.replaceChildren();

          const empty = document.createElement("div");
          empty.style.cssText = "text-align:center;padding:32px;color:#888;";
          empty.textContent = "You haven't sent any hire requests yet.";

          sentRequestsList.appendChild(empty);
          return;
        }

        sentRequestsList.replaceChildren(
          ...data.requests.map((request) => createSentRequestCard(request)),
        );
      })
      .catch(() => {
        sentRequestsList.textContent =
          "Could not load sent requests. Try refreshing.";
        sentRequestsList.style.color = "#888";
        sentRequestsList.style.fontSize = "0.9rem";
      });
  }

  // Last login in stats card
  if (user.lastLogin) {
    const last = new Date(user.lastLogin);
    document.getElementById("lastLogin").textContent = last.toLocaleDateString(
      "en-NG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  }

  // ─── ACTIVITY SECTION ───
  if (user.createdAt) {
    const joined = new Date(user.createdAt);
    document.getElementById("joinedDate").textContent =
      "Joined " +
      joined.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
  }

  // ─── PROVIDER INBOX ───
  if (user.role === "provider") {
    const inboxCard = document.getElementById("providerInbox");
    if (inboxCard) inboxCard.style.display = "block";

    const token = localStorage.getItem("token");
    fetch(`${API_URL}/api/hire/provider`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Could not load requests");
        }

        return data;
      })

      .then((data) => {
        const list = document.getElementById("hireRequestsList");

        if (!data.requests || data.requests.length === 0) {
          list.replaceChildren();

          const empty = document.createElement("div");
          empty.style.cssText = "text-align:center;padding:32px;color:#888;";

          const icon = document.createElement("i");
          icon.className = "bi bi-inbox";
          icon.style.cssText =
            "font-size:2rem;margin-bottom:8px;display:block;";

          const message = document.createElement("div");
          message.textContent =
            "No hire requests yet. Share your profile to start getting jobs!";

          empty.append(icon, message);
          list.appendChild(empty);
          return;
        }

        list.replaceChildren(
          ...data.requests.map((request) => createHireRequestCard(request)),
        );
      })
      .catch(() => {
        const list = document.getElementById("hireRequestsList");
        list.textContent = "Could not load requests. Try refreshing.";
        list.style.color = "#888";
        list.style.fontSize = "0.9rem";
      });
  }

  if (user.lastLogin) {
    const last = new Date(user.lastLogin);
    document.getElementById("lastLoginActivity").textContent =
      last.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  }

  document.getElementById("totalLoginsText").textContent =
    `Total logins: ${user.loginCount || 1}`;
}

function createHireRequestCard(request) {
  const card = document.createElement("div");
  card.style.cssText =
    "padding:18px;border:1px solid #eee;border-radius:12px;margin-bottom:12px;";

  const top = document.createElement("div");
  top.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;gap:12px;";

  const customerBlock = document.createElement("div");

  const name = document.createElement("strong");
  name.textContent = request.customerName;

  const phone = document.createElement("div");
  phone.textContent = request.customerPhone;
  phone.style.cssText = "color:#777;font-size:0.85rem;margin-top:4px;";

  customerBlock.append(name, phone);

  const status = document.createElement("span");
  const statusValue = request.status || "pending";

  status.textContent =
    statusValue.charAt(0).toUpperCase() + statusValue.slice(1);

  status.style.cssText =
    `background:${
      statusValue === "pending"
        ? "#fff8e1"
        : statusValue === "accepted"
          ? "#e6f9ee"
          : "#fff0f0"
    };` +
    `color:${
      statusValue === "pending"
        ? "#b8860b"
        : statusValue === "accepted"
          ? "#007a33"
          : "#c62828"
    };` +
    "padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;";

  top.append(customerBlock, status);

  const service = document.createElement("div");
  service.textContent = request.serviceNeeded;
  service.style.cssText = "font-weight:600;margin-top:14px;";

  const description = document.createElement("div");
  description.textContent = request.description;
  description.style.cssText = "color:#555;font-size:0.9rem;margin-top:6px;";

  const time = document.createElement("div");
  time.textContent = new Date(request.createdAt).toLocaleString();
  time.style.cssText = "color:#999;font-size:0.8rem;margin-top:8px;";

  card.append(top, service, description, time);

  if (statusValue === "pending") {
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:10px;margin-top:14px;";

    const acceptButton = document.createElement("button");
    acceptButton.textContent = "Accept";
    acceptButton.type = "button";
    acceptButton.style.cssText =
      "border:none;background:#00c853;color:white;padding:9px 18px;border-radius:8px;cursor:pointer;font-weight:600;";

    const declineButton = document.createElement("button");
    declineButton.textContent = "Decline";
    declineButton.type = "button";
    declineButton.style.cssText =
      "border:none;background:#f44336;color:white;padding:9px 18px;border-radius:8px;cursor:pointer;font-weight:600;";

    actions.append(acceptButton, declineButton);
    card.append(actions);

    const updateStatus = async (newStatus) => {
      const token = localStorage.getItem("token");

      acceptButton.disabled = true;
      declineButton.disabled = true;
      acceptButton.style.opacity = "0.6";
      declineButton.style.opacity = "0.6";

      try {
        const response = await fetch(
          `${API_URL}/api/hire/${request._id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status: newStatus }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not update request");
        }

        window.location.reload();
      } catch (error) {
        acceptButton.disabled = false;
        declineButton.disabled = false;
        acceptButton.style.opacity = "1";
        declineButton.style.opacity = "1";
        alert(error.message);
      }
    };

    acceptButton.addEventListener("click", () => {
      updateStatus("accepted");
    });

    declineButton.addEventListener("click", () => {
      updateStatus("declined");
    });
  }

  return card;
}

function createSentRequestCard(request) {
  const card = document.createElement("div");
  card.style.cssText =
    "padding:18px;border:1px solid #eee;border-radius:12px;margin-bottom:12px;";

  const top = document.createElement("div");
  top.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;gap:12px;";

  const provider = document.createElement("strong");
  provider.textContent = request.providerName;

  const status = document.createElement("span");
  const statusValue = request.status || "pending";

  status.textContent =
    statusValue.charAt(0).toUpperCase() + statusValue.slice(1);

  status.style.cssText =
    `background:${
      statusValue === "pending"
        ? "#fff8e1"
        : statusValue === "accepted"
          ? "#e6f9ee"
          : "#fff0f0"
    };` +
    `color:${
      statusValue === "pending"
        ? "#b8860b"
        : statusValue === "accepted"
          ? "#007a33"
          : "#c62828"
    };` +
    "padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;";

  top.append(provider, status);

  const service = document.createElement("div");
  service.textContent = request.serviceNeeded;
  service.style.cssText = "font-weight:600;margin-top:14px;";

  const description = document.createElement("div");
  description.textContent = request.description;
  description.style.cssText = "color:#555;font-size:0.9rem;margin-top:6px;";

  const time = document.createElement("div");
  time.textContent = new Date(request.createdAt).toLocaleString();
  time.style.cssText = "color:#999;font-size:0.8rem;margin-top:8px;";

  card.append(top, service, description, time);

  return card;
}

// ─── EDIT PROFILE ───

function handleEditPhotoUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      window.newProfilePhoto = e.target.result;
      const preview = document.getElementById("editAvatarPreview");
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize = "cover";
      preview.style.backgroundPosition = "center";
      preview.textContent = "";
    };
    reader.readAsDataURL(input.files[0]);
  }
}
function openEditProfile() {
  const user = getCurrentUser();
  document.getElementById("editModal").style.display = "flex";
  document.getElementById("editFullName").value = user.fullName || "";
  document.getElementById("editPhone").value = user.phone || "";
  document.getElementById("editState").value = user.state || "";
  document.getElementById("editCity").value = user.city || "";
  document.getElementById("editBio").value = user.bio || "";

  // Show current avatar in edit modal
  const preview = document.getElementById("editAvatarPreview");
  if (user.profilePhoto && user.profilePhoto.startsWith("data:")) {
    preview.style.backgroundImage = `url(${user.profilePhoto})`;
    preview.style.backgroundSize = "cover";
    preview.textContent = "";
  } else {
    const parts = user.fullName.split(" ");
    preview.textContent = (
      parts[0][0] + (parts[1] ? parts[1][0] : "")
    ).toUpperCase();
  }
}

function closeEditProfile() {
  document.getElementById("editModal").style.display = "none";
}

function saveProfile() {
  const token = localStorage.getItem("token");
  const btn = document.getElementById("saveProfileBtn");
  const errEl = document.getElementById("saveError");
  btn.textContent = "Saving...";
  if (errEl) errEl.style.display = "none";

  fetch(`${API_URL}/api/user/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fullName: document.getElementById("editFullName").value,
      phone: document.getElementById("editPhone").value,
      state: document.getElementById("editState").value,
      city: document.getElementById("editCity").value,
      bio: document.getElementById("editBio").value,
      profilePhoto: window.newProfilePhoto || undefined,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.user) {
        // Merge so nothing is lost
        const existing = getCurrentUser();
        const merged = { ...existing, ...data.user };
        localStorage.setItem("user", JSON.stringify(merged));
        btn.textContent = "Saved!";
        setTimeout(() => {
          closeEditProfile();
          window.location.reload();
        }, 1000);
      } else {
        btn.textContent = "Save Changes";
        if (errEl) {
          errEl.textContent = data.message || "Something went wrong";
          errEl.style.display = "block";
        }
      }
    })
    .catch(() => {
      btn.textContent = "Save Changes";
      if (errEl) {
        errEl.textContent = "Connection failed. Try again.";
        errEl.style.display = "block";
      }
    });
}

// ─── DELETE PROFILE ───
function showDeleteModal() {
  document.getElementById("deleteModal").style.display = "flex";
  document.getElementById("deletePassword").value = "";
  document.getElementById("deleteError").style.display = "none";
}

function hideDeleteModal() {
  document.getElementById("deleteModal").style.display = "none";
}

function confirmDeleteAccount() {
  const password = document.getElementById("deletePassword").value;
  const token = localStorage.getItem("token");
  const btn = document.getElementById("deleteBtn");
  const errorEl = document.getElementById("deleteError");

  errorEl.style.display = "none";

  if (!password) {
    errorEl.textContent = "Please enter your password";
    errorEl.style.display = "block";
    return;
  }

  btn.textContent = "Deleting...";
  btn.style.opacity = "0.7";

  fetch(`${API_URL}/api/user/delete-account`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message === "Account deleted successfully.") {
        // Clear everything and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "index.html";
      } else {
        errorEl.textContent = data.message;
        errorEl.style.display = "block";
        btn.textContent = "Yes, Delete My Account";
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
      }
    })
    .catch(() => {
      errorEl.textContent = "Something went wrong. Try again.";
      errorEl.style.display = "block";
      btn.textContent = "Yes, Delete My Account";
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    });
}
