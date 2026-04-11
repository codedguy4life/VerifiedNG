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

  // ─── INITIALS AVATAR ───
  const parts = user.fullName.split(" ");
  const initials = parts[0][0] + (parts[1] ? parts[1][0] : "");
  document.getElementById("userAvatar").textContent = initials.toUpperCase();

  // ─── STATS ───
  document.getElementById("loginCount").textContent = user.loginCount || 1;

  // Days as member
  if (user.createdAt) {
    const joined = new Date(user.createdAt);
    const today = new Date();
    const days = Math.floor((today - joined) / (1000 * 60 * 60 * 24));
    document.getElementById("memberDays").textContent = days || 1;
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

// ─── EDIT PROFILE ───
function openEditProfile() {
  const user = getCurrentUser();
  document.getElementById("editModal").style.display = "flex";
  document.getElementById("editFullName").value = user.fullName || "";
  document.getElementById("editPhone").value = user.phone || "";
  document.getElementById("editState").value = user.state || "";
  document.getElementById("editCity").value = user.city || "";
  document.getElementById("editBio").value = user.bio || "";
}

function closeEditProfile() {
  document.getElementById("editModal").style.display = "none";
}

function saveProfile() {
  const token = localStorage.getItem("token");
  const btn = document.getElementById("saveProfileBtn");
  btn.textContent = "Saving...";

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
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        btn.textContent = "Saved!";
        setTimeout(() => {
          closeEditProfile();
          window.location.reload();
        }, 1000);
      } else {
        btn.textContent = "Save Changes";
        alert(data.message);
      }
    })
    .catch(() => {
      btn.textContent = "Save Changes";
      alert("Something went wrong. Try again.");
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
      }
    })
    .catch(() => {
      errorEl.textContent = "Something went wrong. Try again.";
      errorEl.style.display = "block";
      btn.textContent = "Yes, Delete My Account";
      btn.style.opacity = "1";
    });
}
