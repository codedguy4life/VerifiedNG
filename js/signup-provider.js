let currentStep = 1;

function goToStep(step) {
  if (step > currentStep) {
    if (!validateStep(currentStep)) return;
  }
  document.getElementById(`step${currentStep}`).classList.remove("active");
  document.getElementById(`circle${currentStep}`).classList.remove("active");
  document.getElementById(`circle${currentStep}`).classList.add("done");
  document.getElementById(`circle${currentStep}`).textContent = "✓";
  if (currentStep < step) {
    document.getElementById(`line${currentStep}`)?.classList.add("done");
  }
  currentStep = step;
  document.getElementById(`step${currentStep}`).classList.add("active");
  document.getElementById(`circle${currentStep}`).classList.add("active");
  document.getElementById(`circle${currentStep}`).classList.remove("done");
  document.getElementById(`circle${currentStep}`).textContent = currentStep;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitForm() {
  if (!validateStep(4)) return;

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const state = document.getElementById("stateInput").value;
  const city = document.getElementById("cityInput").value.trim();
  const category = document.getElementById("categoryInput").value;
  const bio = document.getElementById("bioInput").value.trim();
  const password = document.getElementById("providerPass").value;
  const voucherName = document.getElementById("voucherName").value.trim();
  const voucherPhone = document.getElementById("voucherPhone").value.trim();

  const skills = [];
  document.querySelectorAll(".skill-option.selected").forEach((skill) => {
    skills.push(skill.textContent.trim());
  });

  fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: firstName + " " + lastName,
      email,
      password,
      phone,
      role: "provider",
      category,
      bio,
      skills,
      state,
      city,
      voucherName,
      voucherPhone,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.message === "Account created successfully!") {
        document.getElementById("step4").classList.remove("active");
        document.getElementById("circle4").classList.remove("active");
        document.getElementById("circle4").classList.add("done");
        document.getElementById("circle4").textContent = "✓";
        document.getElementById("line3")?.classList.add("done");
        document.getElementById("step5").classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (data.message.includes("Email")) {
          goToStep(1);
          setTimeout(() => showFieldError("emailInput", data.message), 300);
        } else if (data.message.includes("Phone")) {
          goToStep(1);
          setTimeout(() => showFieldError("phoneInput", data.message), 300);
        } else {
          showFieldError("providerPass", data.message);
        }
      }
    })
    .catch((error) => {
      alert("Something went wrong. Please try again.");
      console.log("Error:", error);
    });
}

function showFieldError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = "#e53935";
  el.style.background = "#fff5f5";
  const existing = document.getElementById(id + "_err");
  if (existing) existing.remove();
  const err = document.createElement("span");
  err.id = id + "_err";
  err.style.cssText =
    "color:#e53935;font-size:12px;margin-top:4px;display:block";
  err.textContent = message;
  el.parentNode.insertBefore(err, el.nextSibling);
  el.addEventListener("input", function clearErrorOnType() {
    el.style.borderColor = "";
    el.style.background = "";
    const e = document.getElementById(id + "_err");
    if (e) e.remove();
    el.removeEventListener("input", clearErrorOnType);
  });
}

function clearAllErrors() {
  document.querySelectorAll('[id$="_err"]').forEach((e) => e.remove());
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.style.borderColor = "";
    el.style.background = "";
  });
}

function validateStep(step) {
  clearAllErrors();
  let isValid = true;

  if (step === 1) {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const phone = document.getElementById("phoneInput").value.trim();
    const email = document.getElementById("emailInput").value.trim();
    const state = document.getElementById("stateInput").value;
    const city = document.getElementById("cityInput").value.trim();

    if (!firstName) {
      showFieldError("firstName", "Please enter your first name");
      isValid = false;
    }
    if (!lastName) {
      showFieldError("lastName", "Please enter your last name");
      isValid = false;
    }
    if (!phone) {
      showFieldError("phoneInput", "Please enter your phone number");
      isValid = false;
    } else if (!/^0[7-9][0-1]\d{8}$/.test(phone)) {
      showFieldError(
        "phoneInput",
        "Enter a valid Nigerian number e.g. 08012345678",
      );
      isValid = false;
    }
    if (!email) {
      showFieldError("emailInput", "Please enter your email");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("emailInput", "Enter a valid email address");
      isValid = false;
    }
    if (!state) {
      showFieldError("stateInput", "Please select your state");
      isValid = false;
    }
    if (!city) {
      showFieldError("cityInput", "Please enter your city or area");
      isValid = false;
    }
  }

  if (step === 2) {
    const category = document.getElementById("categoryInput").value;
    const bio = document.getElementById("bioInput").value.trim();
    if (!category) {
      showFieldError("categoryInput", "Please select your main category");
      isValid = false;
    }
    if (!bio) {
      showFieldError("bioInput", "Please write something about yourself");
      isValid = false;
    } else if (bio.length < 30) {
      showFieldError("bioInput", "Please write at least 30 characters");
      isValid = false;
    }
  }

  if (step === 3) {
    const voucherName = document.getElementById("voucherName").value.trim();
    const voucherPhone = document.getElementById("voucherPhone").value.trim();
    if (!voucherName) {
      showFieldError("voucherName", "Please enter your voucher's name");
      isValid = false;
    }
    if (!voucherPhone) {
      showFieldError(
        "voucherPhone",
        "Please enter your voucher's phone number",
      );
      isValid = false;
    }
  }

  if (step === 4) {
    const pass = document.getElementById("providerPass").value;
    const pass2 = document.getElementById("providerPass2").value;
    const terms = document.getElementById("providerTerms").checked;
    if (!pass || pass.length < 8) {
      showFieldError("providerPass", "Password must be at least 8 characters");
      isValid = false;
    }
    if (!pass2) {
      showFieldError("providerPass2", "Please confirm your password");
      isValid = false;
    } else if (pass !== pass2) {
      showFieldError("providerPass2", "Passwords do not match");
      isValid = false;
    }
    if (!terms) {
      const termsEl = document.getElementById("providerTerms");
      const err = document.createElement("span");
      err.style.cssText =
        "color:#e53935;font-size:12px;margin-top:4px;display:block";
      err.textContent = "You must agree to the terms";
      termsEl.parentNode.appendChild(err);
      isValid = false;
    }
  }

  return isValid;
}

function toggleSkill(el) {
  el.classList.toggle("selected");
}

function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

function handleUpload(input, iconId, titleId) {
  if (input.files && input.files[0]) {
    document.getElementById(iconId).textContent = "✅";
    document.getElementById(titleId).textContent = input.files[0].name;
  }
}
