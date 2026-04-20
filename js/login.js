// ─── LOGIN VALIDATION ───

function showError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;
  input.classList.add("error");
  input.classList.remove("success");
  error.textContent = message;
  error.classList.add("show");
}

function showSuccess(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;
  input.classList.remove("error");
  input.classList.add("success");
  error.classList.remove("show");
}

function clearError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;
  input.classList.remove("error", "success");
  error.classList.remove("show");
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^0[7-9][0-1]\d{8}$/.test(phone);
}

function handleLogin(e) {
  e.preventDefault();

  let isValid = true;

  // ─── Email or Phone ───
  const identifier = document.getElementById("loginIdentifier").value.trim();
  if (!identifier) {
    showError(
      "loginIdentifier",
      "identifierError",
      "Please enter your email or phone number",
    );
    isValid = false;
  } else if (!validateEmail(identifier) && !validatePhone(identifier)) {
    showError(
      "loginIdentifier",
      "identifierError",
      "Enter a valid email or Nigerian phone number e.g. 08012345678",
    );
    isValid = false;
  } else {
    showSuccess("loginIdentifier", "identifierError");
  }

  // ─── Password ───
  // Login only checks the field isn't empty
  // (strict rules are for signup, not login)
  const password = document.getElementById("passwordInput").value;
  if (!password) {
    showError("passwordInput", "passwordError", "Please enter your password");
    isValid = false;
  } else {
    showSuccess("passwordInput", "passwordError");
  }

  // ─── If any errors — shake button and stop ───
  if (!isValid) {
    const btn = document.getElementById("loginBtn");
    btn.classList.add("shake");
    setTimeout(() => btn.classList.remove("shake"), 400);
    return;
  }

  // ─── All good — show loading state ───
  const btn = document.getElementById("loginBtn");
  btn.textContent = "Logging In...";
  btn.classList.add("loading");

  // Send to real backend
  fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: identifier,
      password: password,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Login successful!") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        btn.textContent = "Logged In!";
        window.location.href = "index.html";
      } else {
        btn.textContent = "Log In";
        btn.classList.remove("loading");
        // Show error inline — no alert
        showError("loginIdentifier", "identifierError", data.message);
      }
    })
    .catch(() => {
  btn.textContent = "Log In";
  btn.classList.remove("loading");
  showError("loginIdentifier", "identifierError", "Connection failed. Please try again.");
});
}

// ─── REAL TIME VALIDATION ───
// Clears error as soon as user starts typing
document.addEventListener("DOMContentLoaded", function () {
  const fields = ["loginIdentifier", "passwordInput"];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => clearError(id, id + "Error"));
    }
  });
});

// ─── TOGGLE PASSWORD VISIBILITY ───
function togglePassword() {
  const input = document.getElementById("passwordInput");
  input.type = input.type === "password" ? "text" : "password";
}

// ─── ACCOUNT TYPE TOGGLE ───
let accountType = "customer";

function selectType(btn, type) {
  accountType = type;
  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// ─── FORGOT PASSWORD MODAL ───
function showForgotPassword() {
  document.getElementById("forgotModal").style.display = "flex";
}

function hideForgotPassword() {
  document.getElementById("forgotModal").style.display = "none";
  document.getElementById("forgotEmail").value = "";
  document.getElementById("forgotSuccess").style.display = "none";
  document.getElementById("forgotError").style.display = "none";
}

function sendResetLink() {
  const email = document.getElementById("forgotEmail").value.trim();
  const btn = document.getElementById("sendResetBtn");

  document.getElementById("forgotSuccess").style.display = "none";
  document.getElementById("forgotError").style.display = "none";

  if (!email) {
    document.getElementById("forgotErrorText").textContent =
      "Please enter your email address";
    document.getElementById("forgotError").style.display = "block";
    return;
  }

  btn.textContent = "Sending...";
  btn.style.opacity = "0.7";

  fetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("forgotSuccess").style.display = "block";
      btn.textContent = "Sent!";
    })
    .catch(() => {
      document.getElementById("forgotErrorText").textContent =
        "Something went wrong. Try again.";
      document.getElementById("forgotError").style.display = "block";
      btn.textContent = "Send Reset Link";
      btn.style.opacity = "1";
    });
}
