// ─── ACCOUNT TYPE SELECTION ───
function selectType(btn, type) {
  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  // If they choose provider — send them to provider registration
  if (type === "provider") {
    setTimeout(() => {
      window.location.href = "signup-provider.html";
    }, 300);
  }
}

// ─── TOGGLE PASSWORD VISIBILITY ───
function togglePassword() {
  const input = document.getElementById("passwordInput");
  input.type = input.type === "password" ? "text" : "password";
}

// ─── PHOTO UPLOAD PREVIEW ───
function handlePhotoUpload(input) {
  if (input.files && input.files[0]) {
    document.getElementById("uploadIcon").textContent = "✅";
    document.getElementById("uploadText").textContent = input.files[0].name;
  }
}

// ─── VALIDATION HELPERS ───
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

// ─── MAIN SIGNUP HANDLER ───
function handleSignup(e) {
  e.preventDefault();
  let isValid = true;

  // First Name
  const firstName = document.getElementById("firstName").value.trim();
  if (!firstName) {
    showError("firstName", "firstNameError", "Please enter your first name");
    isValid = false;
  } else {
    showSuccess("firstName", "firstNameError");
  }

  // Last Name
  const lastName = document.getElementById("lastName").value.trim();
  if (!lastName) {
    showError("lastName", "lastNameError", "Please enter your last name");
    isValid = false;
  } else {
    showSuccess("lastName", "lastNameError");
  }

  // Email
  const email = document.getElementById("emailInput").value.trim();
  if (!email) {
    showError("emailInput", "emailError", "Please enter your email address");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("emailInput", "emailError", "Please enter a valid email address");
    isValid = false;
  } else {
    showSuccess("emailInput", "emailError");
  }

  // Phone
  const phone = document.getElementById("phoneInput").value.trim();
  if (!phone) {
    showError("phoneInput", "phoneError", "Please enter your phone number");
    isValid = false;
  } else if (!validatePhone(phone)) {
    showError(
      "phoneInput",
      "phoneError",
      "Enter a valid Nigerian number e.g. 08012345678",
    );
    isValid = false;
  } else {
    showSuccess("phoneInput", "phoneError");
  }

  // State
  const state = document.getElementById("stateInput").value;
  if (!state) {
    showError("stateInput", "stateError", "Please select your state");
    isValid = false;
  } else {
    showSuccess("stateInput", "stateError");
  }

  // Address
  const address = document.getElementById("addressInput").value.trim();
  if (!address) {
    showError("addressInput", "addressError", "Please enter your address");
    isValid = false;
  } else {
    showSuccess("addressInput", "addressError");
  }

  // Password
  const password = document.getElementById("passwordInput").value;
  if (!password) {
    showError("passwordInput", "passwordError", "Please enter a password");
    isValid = false;
  } else if (password.length < 8) {
    showError(
      "passwordInput",
      "passwordError",
      "Password must be at least 8 characters",
    );
    isValid = false;
  } else if (!/\d/.test(password)) {
    showError(
      "passwordInput",
      "passwordError",
      "Password must include at least one number",
    );
    isValid = false;
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    showError(
      "passwordInput",
      "passwordError",
      "Password must include at least one special character",
    );
    isValid = false;
  } else {
    showSuccess("passwordInput", "passwordError");
  }

  // Terms
  const terms = document.getElementById("termsCheck").checked;
  if (!terms) {
    const termsError = document.getElementById("termsError");
    termsError.textContent = "You must agree to the terms to continue";
    termsError.classList.add("show");
    isValid = false;
  } else {
    document.getElementById("termsError").classList.remove("show");
  }

  // If errors — shake button and stop
  if (!isValid) {
    const btn = document.getElementById("submitBtn");
    btn.classList.add("shake");
    setTimeout(() => btn.classList.remove("shake"), 400);
    return;
  }

  // All good — show loading
  const btn = document.getElementById("submitBtn");
  btn.textContent = "Creating Account...";
  btn.classList.add("loading");

  // Send data to backend
  fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: firstName + " " + lastName,
      email: email,
      password: password,
      phone: phone,
      role: "customer",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Account created successfully!") {
        btn.textContent = "Account Created!";
        alert("Welcome to VerifiedNG " + firstName + "!");
        window.location.href = "index.html";
      } else {
        // Backend returned an error
        btn.textContent = "Create My Account";
        btn.classList.remove("loading");
        alert(data.message);
      }
    })
    .catch((error) => {
      btn.textContent = "Create My Account";
      btn.classList.remove("loading");
      alert("Something went wrong. Please try again.");
      console.log("Error:", error);
    });
}

// ─── REAL TIME VALIDATION ───
// Clears red error as soon as user starts typing in a field
document.addEventListener("DOMContentLoaded", function () {
  const fields = [
    "firstName",
    "lastName",
    "emailInput",
    "phoneInput",
    "stateInput",
    "addressInput",
    "passwordInput",
  ];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => clearError(id, id + "Error"));
    }
  });
});
