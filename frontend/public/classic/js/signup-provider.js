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

async function submitForm(){
  if(!validateStep(4))return;
  const btn=document.getElementById("providerSubmit");
  if(!API_URL)return showFieldError("providerPass","Account creation is unavailable on this preview until a staging API is configured.");
  const v=id=>document.getElementById(id)?.value?.trim()||"";
  const skills=[...document.querySelectorAll(".skill-option.selected")].map(e=>e.textContent.trim()).filter(Boolean);
  const account={fullName:v("firstName")+" "+v("lastName"),phone:v("phoneInput"),email:v("emailInput"),state:v("stateInput"),city:v("cityInput"),category:v("categoryInput"),bio:v("bioInput"),skills,experienceYears:Number(v("experienceInput"))||0,voucherName:v("voucherName"),voucherPhone:v("voucherPhone"),password:document.getElementById("providerPass").value,termsAccepted:true,referenceConsent:document.getElementById("referenceConsent").checked};
  if(account.bio.length<50){goToStep(2);return showFieldError("bioInput","Please write at least 50 characters about your services.");}
  btn.disabled=true;btn.textContent="Submitting…";
  try{
    // Everyone first becomes a regular member, then provider applications go for manual review.
    const response=await fetch(API_URL+"/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(account)});
    const registered=await response.json();if(!response.ok||!registered.token||!registered.user)throw Error(registered.message||"Could not register your account.");
    localStorage.setItem("token",registered.token);localStorage.setItem("user",JSON.stringify(registered.user));
    const r=await fetch(API_URL+"/api/provider-applications",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+registered.token},body:JSON.stringify({category:account.category,bio:account.bio,skills,state:account.state,city:account.city,experienceYears:account.experienceYears,confirmAccuracy:true})});
    const applied=await r.json();if(!r.ok){alert("Your member account was created, but your provider application needs attention: "+(applied.message||"Please complete it in your account."));window.location.assign("/app?view=provider-apply");return;}
    document.getElementById("step4").classList.remove("active");document.getElementById("step5").classList.add("active");
    const done=document.querySelector("#step5 .btn-home");if(done){done.textContent="View application status";done.onclick=()=>window.location.assign("/app?view=provider-apply");}
  }catch(err){alert(err.message||"Could not submit your application.");}
  finally{btn.disabled=false;btn.textContent="Submit Application ✓";}
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
    if (!document.getElementById("experienceInput").value) {
      showFieldError("experienceInput", "Please choose your experience level");
      isValid = false;
    }
    if (!document.querySelector(".skill-option.selected")) {
      showFieldError("skillsPicker", "Choose at least one skill");
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

  if (step === 3 && !document.getElementById("referenceConsent").checked) {
    showFieldError("referenceConsent", "Please confirm the reference agreed to share their phone number.");
    isValid = false;
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

document.addEventListener("DOMContentLoaded",()=>{if(localStorage.getItem("token"))window.location.replace("/app?view=provider-apply");});
