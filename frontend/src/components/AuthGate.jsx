import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, MapPin, ShieldCheck, Users } from "lucide-react";
import { api } from "../lib/api.js";
import ThemePicker from "./ThemePicker.jsx";

const query = new URLSearchParams(window.location.search);
const resetToken = query.get("reset_token");
const resetEmail = query.get("email");

export default function AuthGate({ onAuthenticated, onResetFinished, theme = "system", onThemeChange = () => {} }) {
  const [mode, setMode] = useState(() => resetToken ? "reset" : window.location.pathname === "/signup" ? "signup" : window.location.pathname === "/forgot-password" ? "forgot" : "login");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fields, setFields] = useState({identifier:"",loginPassword:"",fullName:"",email:resetEmail || "",phone:"",state:"",city:"",password:"",confirm:""});
  const [busy,setBusy] = useState(false);
  const [show,setShow] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const value = (name) => fields[name];
  const change = (name) => (event) => setFields((current) => ({...current,[name]:event.target.value}));
  function switchMode(next) {
    setMode(next);setError("");setNotice("");setShow(false);
    if(mode==="reset" && next!=="reset") {onResetFinished();}
    const nextParam = new URLSearchParams(window.location.search).get("next") === "provider" ? "?next=provider" : "";
    const route = next==="signup" ? "/signup" : next==="forgot" ? "/forgot-password" : "/login";
    window.history.replaceState(null,"",route + nextParam);
  }
  async function submit(event) {
    event.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
    try {
      if(mode==="login") {
        const result=await api("/api/auth/login",{method:"POST",body:JSON.stringify({identifier:value("identifier").trim(),password:value("loginPassword")})});
        if(!result.token||!result.user)throw new Error("Login response was incomplete.");
        setFields(f=>({...f,loginPassword:""}));onAuthenticated(result);
      } else if(mode==="signup") {
        if(!acceptedTerms)throw new Error("Read and agree to the Terms and Privacy Policy to create an account.");
        if(value("password").length<8)throw new Error("Password must be at least 8 characters.");
        if(value("password")!==value("confirm"))throw new Error("Passwords do not match.");
        const result=await api("/api/auth/register",{method:"POST",body:JSON.stringify({
          fullName:value("fullName").trim(),email:value("email").trim().toLowerCase(),phone:value("phone").trim(),
          city:value("city").trim(),state:value("state").trim(),password:value("password"),
          termsAccepted:true
        })});
        if(!result.token||!result.user)throw new Error("Account created. Please sign in.");
        setFields(f=>({...f,password:"",confirm:""}));setAcceptedTerms(false);onAuthenticated(result);
      } else if(mode==="forgot") {
        const result=await api("/api/auth/forgot-password",{method:"POST",signal:AbortSignal.timeout(75000),body:JSON.stringify({email:value("email").trim().toLowerCase()})});
        setNotice(result.message||"If that email is registered, a reset link will be sent.");
      } else if(mode==="reset") {
        if(!resetToken||!resetEmail)throw new Error("Incomplete reset link. Request a new one.");
        if(value("password").length<8||value("password")!==value("confirm"))throw new Error("Passwords must match and be at least 8 characters.");
        await api("/api/auth/reset-password",{method:"POST",body:JSON.stringify({email:resetEmail,token:resetToken,newPassword:value("password")})});
        window.history.replaceState(null,"",window.location.pathname);onResetFinished();
        setFields(f=>({...f,password:"",confirm:"",identifier:resetEmail}));setMode("login");setNotice("Password changed. Sign in with your new password.");
      }
    } catch(err) {setError(err.name==="TimeoutError" || err.name==="AbortError" ? "The email request took too long. Please try again shortly." : (err.message||"Request failed. Please try again."));}
    finally {setBusy(false);}
  }
  const login=mode==="login",signup=mode==="signup",forgot=mode==="forgot",reset=mode==="reset";
  const field=(label,name,props={})=><label key={name}>{label}<input value={value(name)} onChange={change(name)} required {...props}/></label>;
  return <main className="auth-entry">
    <aside className="auth-entry-hero">
      <a href="/" className="auth-entry-brand">Verified<span>NG</span></a>
      <div><small>YOUR COMMUNITY, YOUR CONNECTIONS</small><h1>Connect with the people and places around you.</h1>
        <p>Discover local services, share news, explore listings and meet neighbours across Nigeria.</p>
        <div className="auth-entry-benefits"><span><Users size={18}/> Community conversations</span><span><MapPin size={18}/> Local recommendations</span><span><ShieldCheck size={18}/> Safety and trust</span></div>
      </div><small>VerifiedNG · Your neighbourhood matters.</small>
    </aside>
    <section className="auth-entry-content">
      <div className="auth-theme-slot"><ThemePicker theme={theme} onChange={onThemeChange} menu /></div>
      <a href="/" className="auth-entry-brand auth-entry-mobile">Verified<span>NG</span></a>
      <div className="auth-entry-card">
        {!login&&<button className="auth-entry-back" type="button" onClick={()=>switchMode("login")}><ArrowLeft size={16}/> Back to sign in</button>}
        <small>{signup?"JOIN VERIFIEDNG":login?"WELCOME BACK":"ACCOUNT RECOVERY"}</small>
        <h2>{signup?"Join your community.":login?"Your community is waiting.":forgot?"Forgot your password?":"Set a new password."}</h2>
        <p>{signup?"Create a free member account to get started.":login?"Sign in with your email address or phone number.":forgot?"Enter your email. We'll send you a reset link if an account exists.":"Enter and confirm a new password."}</p>
        {error&&<p className="auth-entry-error" role="alert">{error}</p>}
        {notice&&<p className="auth-entry-success" role="status">{notice}</p>}
        <form className="auth-entry-form" onSubmit={submit}>
          {signup&&<>{field("Full name","fullName",{autoComplete:"name",minLength:2,maxLength:100,placeholder:"Your full name"})}
            {field("Email address","email",{type:"email",autoComplete:"email",maxLength:200,placeholder:"you@example.com"})}
            {field("Phone number","phone",{type:"tel",autoComplete:"tel",minLength:10,maxLength:30,placeholder:"080..."})}
            <div className="auth-entry-two">{field("State","state",{required:false,maxLength:80,placeholder:"Lagos"})}{field("City or area","city",{required:false,maxLength:80,placeholder:"Ikeja"})}</div>
            <span className="auth-entry-hint">Your location helps us show nearby posts and services. You can update it later.</span></>}
          {login&&field("Email or phone","identifier",{autoComplete:"username",placeholder:"Your email or phone"})}
          {forgot&&field("Account email","email",{type:"email",autoComplete:"email",placeholder:"you@example.com"})}
          {reset&&<label>Account email<input type="email" disabled readOnly value={resetEmail||""}/></label>}
          {(signup||login||reset)&&<label>{reset?"New password":"Password"}<span className="auth-entry-password">
            <input type={show?"text":"password"} autoComplete={login?"current-password":"new-password"} value={value(login?"loginPassword":"password")} onChange={change(login?"loginPassword":"password")} required minLength={login?undefined:8} placeholder={login?"Your password":"At least 8 characters"}/>
            <button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Hide password":"Show password"}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
          </span></label>}
          {(signup||reset)&&field("Confirm password","confirm",{type:show?"text":"password",autoComplete:"new-password",minLength:8,placeholder:"Repeat password"})}
          {signup&&<label className="auth-entry-consent"><input type="checkbox" required checked={acceptedTerms} onChange={(event)=>setAcceptedTerms(event.target.checked)}/><span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and have read the <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</span></label>}
          {login&&<button className="auth-entry-forgot" type="button" onClick={()=>{setFields(f=>({...f,email:value("identifier").includes("@")?value("identifier"):""}));switchMode("forgot");}}>Forgot password?</button>}
          <button className="auth-entry-submit" type="submit" disabled={busy}>{busy?"Please wait…":login?"Sign in":signup?"Create account":forgot?"Send reset link":"Reset password"} <ArrowRight size={17}/></button>
        </form>
        {login&&<p className="auth-entry-switch">New to VerifiedNG? <button type="button" onClick={()=>switchMode("signup")}>Create an account</button></p>}
        {signup&&<p className="auth-entry-switch">Already a member? <button type="button" onClick={()=>switchMode("login")}>Sign in</button></p>}
        {signup&&<p className="auth-entry-note"><ShieldCheck size={16}/> All new accounts start as members. Provider applications are reviewed separately; no account becomes a verified provider automatically.</p>}
        {new URLSearchParams(window.location.search).get("next")==="provider"&&<p className="auth-entry-provider-note">After you sign in, you'll continue to the provider application.</p>}
      </div><p className="auth-entry-footer"><a href="/">Homepage</a> · <a href="/safety">Safety</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></p>
    </section>
  </main>;
}
