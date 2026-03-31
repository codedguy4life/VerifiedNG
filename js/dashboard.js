// PROTECTED — redirects to login if not logged in
const user = checkAuth();

if (user) {
  document.getElementById("firstName").textContent =
    user.fullName.split(" ")[0];
  document.getElementById("navGreeting").textContent =
    "Hi, " + user.fullName.split(" ")[0];
  document.getElementById("userFullName").textContent = user.fullName;
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userRole").textContent =
    user.role === "customer" ? "Customer" : "Service Provider";

  // Initials avatar
  const parts = user.fullName.split(" ");
  const initials = parts[0][0] + (parts[1] ? parts[1][0] : "");
  document.getElementById("userAvatar").textContent = initials.toUpperCase();
}

// EDIT PROFILE
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
      authorization: token,
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
