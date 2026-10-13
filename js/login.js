// Login form behaviour for login.html.
// Keep these functions at top level because the HTML calls them with onclick.

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
  error.textContent = "";
}

function clearError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (!input || !error) return;
  input.classList.remove("error", "success");
  error.classList.remove("show");
  error.textContent = "";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^0[7-9][0-1]\d{8}$/.test(phone);
}

async function handleLogin(event) {
  event.preventDefault();

  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("passwordInput").value;
  let valid = true;

  if (!identifier) {
    showError("loginIdentifier", "identifierError", "Please enter your email or phone number");
    valid = false;
  } else if (!validateEmail(identifier) && !validatePhone(identifier)) {
    showError("loginIdentifier", "identifierError", "Enter a valid email or Nigerian phone number e.g. 08012345678");
    valid = false;
  } else {
    showSuccess("loginIdentifier", "identifierError");
  }

  if (!password) {
    showError("passwordInput", "passwordError", "Please enter your password");
    valid = false;
  } else {
    showSuccess("passwordInput", "passwordError");
  }

  const button = document.getElementById("loginBtn");
  if (!valid) {
    button.classList.add("shake");
    setTimeout(() => button.classList.remove("shake"), 400);
    return;
  }

  button.disabled = true;
  button.textContent = "Logging In...";
  button.classList.add("loading");
  let loginSucceeded = false;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await response.json();

    if (!response.ok || !data.token || !data.user) {
      showError("loginIdentifier", "identifierError", data.message || "Could not log in. Please try again.");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    loginSucceeded = true;
    button.textContent = "Logged In!";
    window.location.href = "index.html";
  } catch (error) {
    showError("loginIdentifier", "identifierError", "Connection failed. Please try again.");
  } finally {
    if (!loginSucceeded) {
      button.disabled = false;
      button.textContent = "Log In";
      button.classList.remove("loading");
    }
  }
}

function togglePassword() {
  const input = document.getElementById("passwordInput");
  if (input) input.type = input.type === "password" ? "text" : "password";
}

let accountType = "customer";
function selectType(button, type) {
  accountType = type;
  document.querySelectorAll(".account-type .type-btn").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
}

function showForgotPassword() {
  const modal = document.getElementById("forgotModal");
  if (modal) modal.style.display = "flex";
}

function hideForgotPassword() {
  const modal = document.getElementById("forgotModal");
  if (modal) modal.style.display = "none";
  const email = document.getElementById("forgotEmail");
  if (email) email.value = "";
  const success = document.getElementById("forgotSuccess");
  const error = document.getElementById("forgotError");
  if (success) success.style.display = "none";
  if (error) error.style.display = "none";
}

async function sendResetLink() {
  const email = document.getElementById("forgotEmail").value.trim();
  const button = document.getElementById("sendResetBtn");
  const success = document.getElementById("forgotSuccess");
  const errorBox = document.getElementById("forgotError");
  const errorText = document.getElementById("forgotErrorText");

  success.style.display = "none";
  errorBox.style.display = "none";

  if (!email || !validateEmail(email)) {
    errorText.textContent = "Please enter a valid email address";
    errorBox.style.display = "block";
    return;
  }

  button.disabled = true;
  button.textContent = "Sending...";
  try {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Could not send the reset link.");
    success.style.display = "block";
    button.textContent = "Sent!";
  } catch (error) {
    errorText.textContent = error.message || "Something went wrong. Try again.";
    errorBox.style.display = "block";
    button.textContent = "Send Reset Link";
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ["loginIdentifier", "passwordInput"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", () => clearError(id, id === "loginIdentifier" ? "identifierError" : "passwordError"));
  });
});
