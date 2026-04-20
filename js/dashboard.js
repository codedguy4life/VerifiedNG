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
const avatarEl = document.getElementById('userAvatar');
if (user.profilePhoto && user.profilePhoto.startsWith('data:')) {
  // Show real photo
  avatarEl.style.backgroundImage = `url(${user.profilePhoto})`;
  avatarEl.style.backgroundSize = 'cover';
  avatarEl.style.backgroundPosition = 'center';
  avatarEl.textContent = '';
} else {
  // Show initials
  const parts = user.fullName.split(' ');
  const initials = parts[0][0] + (parts[1] ? parts[1][0] : '');
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
  if (user.role === 'provider') {
    const inboxCard = document.getElementById('providerInbox');
    if (inboxCard) inboxCard.style.display = 'block';

    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/hire/provider/${user.id}`, {
      headers: { authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('hireRequestsList');
      if (!data.requests || data.requests.length === 0) {
        list.innerHTML = `
          <div style="text-align:center;padding:32px;color:#888;">
            <i class="bi bi-inbox" style="font-size:2rem;margin-bottom:8px;display:block;"></i>
            No hire requests yet. Share your profile to start getting jobs!
          </div>
        `;
        return;
      }

      list.innerHTML = data.requests.map(r => `
        <div style="border:1px solid #eee;border-radius:12px;padding:20px;
          margin-bottom:12px;background:#fafafa;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;
            margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-weight:700;font-family:Syne,sans-serif;font-size:1rem;">
                ${r.customerName}
              </div>
              <div style="font-size:0.82rem;color:#888;margin-top:2px;">
                <i class="bi bi-phone"></i> ${r.customerPhone}
              </div>
            </div>
            <span style="background:${r.status === 'pending' ? '#fff8e1' : r.status === 'accepted' ? '#e6f9ee' : '#fff0f0'};
              color:${r.status === 'pending' ? '#b8860b' : r.status === 'accepted' ? '#007a33' : '#c62828'};
              padding:4px 12px;border-radius:20px;font-size:0.8rem;font-weight:600;">
              ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </span>
          </div>
          <div style="font-size:0.88rem;margin-bottom:8px;">
            <strong>Service:</strong> ${r.serviceNeeded}
          </div>
          <div style="font-size:0.88rem;color:#555;margin-bottom:12px;
            background:white;padding:12px;border-radius:8px;border:1px solid #eee;">
            ${r.description}
          </div>
          <div style="font-size:0.78rem;color:#aaa;margin-bottom:12px;">
            <i class="bi bi-clock"></i> 
            ${new Date(r.createdAt).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://wa.me/234${r.customerPhone.replace(/^0/, '')}"
              target="_blank"
              style="background:#25D366;color:white;padding:8px 16px;
              border-radius:8px;text-decoration:none;font-size:0.85rem;font-weight:600;">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </a>
            <a href="tel:${r.customerPhone}"
              style="background:#1a1a2e;color:white;padding:8px 16px;
              border-radius:8px;text-decoration:none;font-size:0.85rem;font-weight:600;">
              <i class="bi bi-telephone"></i> Call
            </a>
          </div>
        </div>
      `).join('');
    })
    .catch(() => {
      document.getElementById('hireRequestsList').innerHTML =
        "<p style='color:#888;font-size:0.9rem;'>Could not load requests. Try refreshing.</p>";
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

function handleEditPhotoUpload(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.newProfilePhoto = e.target.result;
      const preview = document.getElementById('editAvatarPreview');
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.textContent = '';
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
  const preview = document.getElementById('editAvatarPreview');
  if (user.profilePhoto && user.profilePhoto.startsWith('data:')) {
    preview.style.backgroundImage = `url(${user.profilePhoto})`;
    preview.style.backgroundSize = 'cover';
    preview.textContent = '';
  } else {
    const parts = user.fullName.split(' ');
    preview.textContent = (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
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
