function togglePassword(){const el=document.getElementById("passwordInput");el.type=el.type==="password"?"text":"password";}
function signupError(text){let el=document.getElementById("signupError");if(!el){el=document.createElement("p");el.id="signupError";el.style.cssText="color:#b42318;padding:12px 0";document.getElementById("submitBtn").after(el);}el.textContent=text;}
async function handleSignup(event){
  event.preventDefault(); const v=id=>document.getElementById(id).value.trim();
  const first=v("firstName"),last=v("lastName"),email=v("emailInput"),phone=v("phoneInput"),state=v("stateInput"),city=v("addressInput"),password=document.getElementById("passwordInput").value,button=document.getElementById("submitBtn");
  if(!first||!last||!email||!phone||!state||!city||password.length<8)return signupError("Please complete every field and use a password of at least 8 characters.");
  if(!document.getElementById("termsCheck").checked)return signupError("You must agree to the Terms and Privacy Policy.");
  if(!API_URL)return signupError("Account creation is unavailable in this preview until the staging API is configured.");
  button.disabled=true;button.textContent="Creating Account…";
  try{const res=await fetch(API_URL+"/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName:first+" "+last,email,phone,state,city,password,termsAccepted:true})});const data=await res.json();if(!res.ok||!data.token||!data.user)throw Error(data.message||"Registration failed.");localStorage.setItem("token",data.token);localStorage.setItem("user",JSON.stringify(data.user));window.location.assign("/app");}
  catch(err){signupError(err.message||"Could not create account.");}finally{button.disabled=false;button.textContent="Create My Account";}
}
