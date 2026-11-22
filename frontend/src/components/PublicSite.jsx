import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, CheckCircle2, ChevronDown,
  Compass, FileText, Globe2, HeartHandshake, LockKeyhole, MapPin,
  Menu, MessageCircle, Search, ShieldCheck, ShoppingBag,
  Sparkles, Users, Wrench, X,
} from "lucide-react";
import { api } from "../lib/api.js";

const infoLinks = [
  { href: "/about", label: "About" },
  { href: "/safety", label: "Safety" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];
const features = [
  { icon: MessageCircle, title: "Community posts", description: "Share updates and talk with people across Nigeria." },
  { icon: Search, title: "Find services", description: "Find skilled people and check their profiles." },
  { icon: ShoppingBag, title: "For Sale", description: "Buy, sell and message sellers in one place." },
  { icon: Users, title: "Groups", description: "Meet people who share your interests." },
];
const steps = [
  { number: "01", title: "Create an account", description: "Sign up for free. Add your area if you want." },
  { number: "02", title: "Explore", description: "See posts, find services and browse listings." },
  { number: "03", title: "Connect", description: "Chat, join groups and share what's happening." },
];

function Brand({ light = false }) {
  return <span className={light ? "public-brand public-brand-light" : "public-brand"}>
    <span className="public-brand-symbol"><ShieldCheck size={19} strokeWidth={2.6} /></span>
    Verified<span>NG</span>
  </span>;
}
function PageHeading({ eyebrow, title, description }) {
  return <div className="public-page-heading">
    <span className="public-eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>{description}</p>
  </div>;
}
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", topic: "General enquiry", message: "", website: "" });
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!consent) { setError("Please confirm you've read the Privacy Policy."); return; }
    setBusy(true); setError(""); setStatus("");
    try {
      const response = await api("/api/public/contact", {
        method: "POST", body: JSON.stringify(form),
      });
      setStatus(response.message || "Thanks. We received your message.");
      setForm({ name: "", email: "", topic: "General enquiry", message: "", website: "" });
      setConsent(false);
    } catch (cause) {
      setError(cause.message || "Your message could not be sent. Please try again.");
    } finally { setBusy(false); }
  }
  return <form className="public-contact-form" onSubmit={submit}>
    <div className="public-form-two">
      <label>Your name<input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={update("name")} placeholder="Full name" /></label>
      <label>Email address<input required type="email" maxLength={200} autoComplete="email" value={form.email} onChange={update("email")} placeholder="you@example.com" /></label>
    </div>
    <label>What's this about?
      <select value={form.topic} onChange={update("topic")}>
        <option>General enquiry</option><option>Account or login</option>
        <option>Provider application</option><option>Safety or report</option>
        <option>Privacy or data</option><option>Other</option>
      </select>
    </label>
    <label>How can we help?<textarea required minLength={15} maxLength={2000} rows={6} value={form.message} onChange={update("message")} placeholder="Tell us what happened, including any details that would help us respond. Please don't send passwords or verification codes." /></label>
    <label className="public-hidden-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} /></label>
    <label className="public-legal-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /> <span>I've read the <a href="/privacy">Privacy Policy</a> and understand that VerifiedNG will use my details to handle this enquiry.</span></label>
    {error && <p className="public-form-error" role="alert">{error}</p>}
    {status && <p className="public-form-success" role="status"><CheckCircle2 size={16} /> {status}</p>}
    <button type="submit" className="public-button public-button-primary" disabled={busy}>{busy ? "Sending…" : "Send message"} <ArrowRight size={17} /></button>
  </form>;
}

export default function PublicSite({ page = "home", loggedIn = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const titles = {
      home: "VerifiedNG — Your Community. Your Connections.",
      about: "About VerifiedNG",
      safety: "Safety on VerifiedNG",
      privacy: "Privacy Policy — VerifiedNG",
      terms: "Terms of Service — VerifiedNG",
      contact: "Contact VerifiedNG",
      "become-a-provider": "Become a Provider — VerifiedNG",
    };
    document.title = titles[page] || titles.home;
  }, [page]);
  const appHref = loggedIn ? "/app" : "/signup";
  const hero = page === "home";
  return <div className="public-site">
    <header className="public-header">
      <div className="public-container public-header-inner">
        <a href="/" aria-label="VerifiedNG homepage"><Brand /></a>
        <nav className={menuOpen ? "public-nav public-nav-open" : "public-nav"} aria-label="Primary navigation">
          <a href={hero ? "#features" : "/#features"} onClick={() => setMenuOpen(false)}>Explore</a>
          <a href="/become-a-provider" onClick={() => setMenuOpen(false)}>For providers</a>
          <a href="/about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="/safety" onClick={() => setMenuOpen(false)}>Safety</a>
          <a href="/contact" onClick={() => setMenuOpen(false)}>Contact</a>
          <div className="public-nav-mobile-actions">
            <a href={loggedIn ? "/app" : "/login"}>{loggedIn ? "Open community" : "Log in"}</a>
            {!loggedIn && <a href="/signup" className="public-mobile-join">Join VerifiedNG</a>}
          </div>
        </nav>
        <div className="public-header-actions">
          <a href={loggedIn ? "/app" : "/login"} className="public-signin">{loggedIn ? "My community" : "Log in"}</a>
          {!loggedIn && <a href="/signup" className="public-button public-button-primary">Join for free <ArrowRight size={16} /></a>}
        </div>
        <button className="public-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={24}/> : <Menu size={24}/>}</button>
      </div>
    </header>

    {page === "home" && <>
      <section className="public-hero">
        <div className="public-container public-hero-grid">
          <div className="public-hero-copy">
            <span className="public-hero-kicker"><span className="public-kicker-dot" /> Built for Nigerians</span>
            <h1>Your community.<br/><em>All in one place.</em></h1>
            <p>See what people are sharing, find local services, buy and sell, and connect with people around you.</p>
            <div className="public-hero-actions">
              <a className="public-button public-button-primary public-button-large" href={appHref}>{loggedIn ? "Go to your community" : "Join your community"} <ArrowRight size={18}/></a>
              <a className="public-button public-button-light public-button-large" href="#features">Explore VerifiedNG <ArrowUpRight size={17}/></a>
            </div>
            <div className="public-hero-footnote"><ShieldCheck size={16}/> Free to join · No location required</div>
          </div>
          <div className="public-product-visual" aria-label="Illustrative preview of the VerifiedNG community experience">
            <div className="public-preview-top"><Brand/><span>Illustrative preview</span></div>
            <div className="public-preview-tabs"><span className="on"><Compass size={14}/> Home</span><span><Search size={14}/> Search</span><span><ShoppingBag size={14}/> For Sale</span></div>
            <article className="public-preview-post">
              <div className="public-preview-author"><span className="public-preview-avatar">V</span><div><strong>Your neighbourhood</strong><small>Community conversation · Across Nigeria</small></div><span className="public-preview-more">•••</span></div>
              <h3>There's more happening around you than you think.</h3>
              <p>Share a useful tip, ask a question, or discover something worth knowing.</p>
              <div className="public-preview-scene"><span className="public-scene-sun"/><span className="public-scene-road"/><span className="public-scene-building building-a"/><span className="public-scene-building building-b"/><span className="public-scene-building building-c"/><span className="public-scene-tree tree-a"/><span className="public-scene-tree tree-b"/><span className="public-scene-caption">Find what matters, right where you are.</span></div>
              <div className="public-preview-interactions"><span><HeartHandshake size={16}/> Connect</span><span><MessageCircle size={16}/> Discuss</span><span><ArrowUpRight size={16}/> Discover</span></div>
            </article>
            <div className="public-floating-tag tag-one"><span><MapPin size={16}/></span><div><strong>Local discovery</strong><small>Your area, your choice</small></div></div>
            <div className="public-floating-tag tag-two"><span><BadgeCheck size={16}/></span><div><strong>Trust matters</strong><small>Check profiles and status</small></div></div>
          </div>
        </div>
      </section>

      <section className="public-feature-section" id="features">
        <div className="public-container">
          <div className="public-section-heading"><div><span className="public-eyebrow">WHAT YOU CAN DO</span><h2>Find more in your community.</h2></div><p>Posts, people and places — all in one place.</p></div>
          <div className="public-features-grid">{features.map(({ icon: Icon, title, description }, index) => <div className="public-feature-card" key={title}><span className={"public-feature-icon public-feature-tone-" + index}><Icon size={23}/></span><h3>{title}</h3><p>{description}</p><span className="public-feature-bottom">Explore VerifiedNG <ArrowUpRight size={15}/></span></div>)}</div>
        </div>
      </section>
      <section className="public-steps-section" id="how-it-works">
        <div className="public-container">
          <div className="public-section-heading public-section-heading-center"><div><span className="public-eyebrow">HOW IT WORKS</span><h2>Getting started is easy.</h2></div></div>
          <div className="public-steps-grid">{steps.map((step) => <div key={step.number} className="public-step"><span>{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></div>)}</div>
        </div>
      </section>
      <section className="public-trust-section">
        <div className="public-container public-trust-grid">
          <div><span className="public-eyebrow public-eyebrow-light">SAFETY FIRST</span><h2>Connect with more confidence.</h2><p>Check profiles before you deal with someone. Use the report tools if something feels wrong. Not every member is verified.</p><a href="/safety" className="public-button public-button-outline">See safety tips <ArrowRight size={17}/></a></div>
          <div className="public-trust-list"><div><ShieldCheck size={21}/><div><strong>Check profiles</strong><span>See a member's verification status.</span></div></div><div><LockKeyhole size={21}/><div><strong>Your choice</strong><span>You don't have to share your location.</span></div></div><div><HeartHandshake size={21}/><div><strong>Report concerns</strong><span>Flag posts or listings that seem unsafe.</span></div></div></div>
        </div>
      </section>
      <section className="public-provider-section">
        <div className="public-container public-provider-grid"><div className="public-provider-symbol"><div className="public-provider-visual-label"><Wrench size={28}/><span>Skilled people.<strong>Real opportunities.</strong></span></div><div className="public-provider-sample"><span>PROFILE</span><strong>Your services, in one place.</strong><p>Show what you do and where you work.</p><div><CheckCircle2 size={15}/> Applications reviewed by the team</div></div></div><div><span className="public-eyebrow">FOR SERVICE PROVIDERS</span><h2>Let people find your skills.</h2><p>Are you an electrician, tutor, tailor or another skilled professional? Apply to offer your services on VerifiedNG.</p><a href="/become-a-provider" className="public-button public-button-primary">Become a provider <ArrowRight size={17}/></a></div></div>
      </section>
      <section className="public-faq-section"><div className="public-container public-faq-grid"><div><span className="public-eyebrow">QUICK ANSWERS</span><h2>Good to know.</h2><p>Answers to common questions.</p></div><div className="public-faq-list">
        <details><summary>Is VerifiedNG free to join? <ChevronDown size={17}/></summary><p>Yes. You can create an account for free.</p></details>
        <details><summary>Will everyone see what I post? <ChevronDown size={17}/></summary><p>Yes. New posts are shared with VerifiedNG members across Nigeria. You can filter posts by area. Older private posts stay restricted.</p></details>
        <details><summary>Does a provider badge guarantee quality? <ChevronDown size={17}/></summary><p>No. Always check a provider's work and details yourself before hiring.</p></details>
        <details><summary>How do I report a concern? <ChevronDown size={17}/></summary><p>Report the post or listing, or contact our team. If you're in danger, call local emergency services.</p></details>
      </div></div></section>
      <section className="public-final-cta"><div className="public-container public-final-inner"><div><span className="public-eyebrow">JOIN VERIFIEDNG</span><h2>Be part of your community.</h2><p>Join the conversation today.</p></div><a href={appHref} className="public-button public-button-primary public-button-large">{loggedIn ? "Open VerifiedNG" : "Get started for free"} <ArrowRight size={18}/></a></div></section>
    </>}

    {page === "about" && <main className="public-info-main public-container"><PageHeading eyebrow="OUR STORY" title="Bringing people together." description="VerifiedNG helps Nigerians share, discover and connect."/>
      <div className="public-info-feature"><div><span className="public-eyebrow">WHY WE EXIST</span><h2>Good connections change everyday life.</h2><p>Finding a trusted recommendation, the right service professional or someone nearby who has the answer should feel easier. We are building a place where Nigerians can connect through useful conversations, local knowledge and clearer information.</p><p>Our vision has grown beyond a service directory: VerifiedNG brings public community posts, local discovery, marketplace listings and interest-based groups together in one experience.</p></div><div className="public-info-highlight"><Globe2 size={35}/><h3>Local roots. Wider connections.</h3><p>Discover what's happening across Nigeria, then narrow the conversation when you want to focus on your own area.</p></div></div>
      <div className="public-values"><div><ShieldCheck size={22}/><h3>Trust with transparency</h3><p>We distinguish between unverified accounts, applications under review and verified members.</p></div><div><Users size={22}/><h3>Community first</h3><p>We value helpful conversations and respect for neighbours, customers and service providers.</p></div><div><Compass size={22}/><h3>Useful discovery</h3><p>We want finding opportunities, services and information to be simple and relevant.</p></div></div>
      <p className="public-info-note">VerifiedNG is evolving. Some features are being improved and reviewed as the community grows; we won't treat a profile or badge as a guarantee.</p>
    </main>}
    {page === "become-a-provider" && <main className="public-info-main public-container"><PageHeading eyebrow="GROW WITH VERIFIEDNG" title="Bring your skills to VerifiedNG." description="Tell people what you do. Apply to become a provider. All applications are reviewed."/>
      <div className="public-provider-apply-layout"><section><h2>Who can apply?</h2><p>Service professionals and small businesses across Nigeria can apply, including people working in repairs, education, beauty, events, home services and more.</p><div className="public-application-steps"><div><span>1</span><div><strong>Start with a free member account</strong><p>Existing members can sign in instead of creating a second account.</p></div></div><div><span>2</span><div><strong>Tell us about your work</strong><p>Describe your service category, experience and skills.</p></div></div><div><span>3</span><div><strong>Submit for manual review</strong><p>Provider access only becomes available if the application is approved.</p></div></div></div><p className="public-info-note">Provider approval and community verification are different processes. Neither is an endorsement or guarantee of service quality.</p></section><aside className="public-apply-card"><Wrench size={32}/><h3>Ready to apply?</h3><p>It starts with your VerifiedNG account. No invitation code is required to submit an application.</p><a href={loggedIn ? "/app" : "/signup?next=provider"} className="public-button public-button-primary">{loggedIn ? "Continue in your account" : "Create account & apply"} <ArrowRight size={17}/></a><a href={loggedIn ? "/app" : "/login?next=provider"} className="public-apply-signin">{loggedIn ? "Open VerifiedNG" : "Already a member? Sign in"}</a><small>Every application is reviewed. Do not pay anyone who promises guaranteed approval.</small></aside></div>
    </main>}
    {page === "safety" && <main className="public-info-main public-container"><PageHeading eyebrow="SAFETY & TRUST" title="Stay safe on VerifiedNG." description="Simple tips to help you connect and trade with care."/>
      <div className="public-info-card-grid">{[
        ["Check before you trust", "A provider's profile or verification status is information, not a guarantee. Verify credentials, references and work history where it matters."],
        ["Keep conversations respectful", "Avoid harassment, threats, hate speech, deception and sharing someone else's private information without permission."],
        ["Be careful with payments", "Inspect items before paying, agree on prices and scope in writing, and avoid urgent advance-payment requests from strangers."],
        ["Meet thoughtfully", "For first meetings, prefer public places or take someone you trust. Tell someone where you're going."],
        ["Protect your account", "Use a strong password and never share login codes, passwords or sensitive financial details in messages."],
        ["Report suspicious activity", "Use in-app reporting options or contact VerifiedNG. If there's an immediate threat, contact local emergency services."],
      ].map(([title,description],index)=><section key={title} className="public-information-card"><span className="public-information-number">0{index+1}</span><h3>{title}</h3><p>{description}</p></section>)}</div>
      <div className="public-info-action"><ShieldCheck size={28}/><div><h3>Something doesn't feel right?</h3><p>Tell us what happened without sending passwords or verification codes.</p></div><a href="/contact" className="public-button public-button-primary">Contact VerifiedNG <ArrowRight size={16}/></a></div>
    </main>}
    {page === "privacy" && <main className="public-info-main public-container"><PageHeading eyebrow="YOUR INFORMATION" title="Privacy Policy" description="How VerifiedNG collects, uses and shares information when you visit the website or use the community."/>
      <div className="public-policy-layout"><aside><strong>In this policy</strong><a href="#privacy-collect">Information we collect</a><a href="#privacy-use">How we use it</a><a href="#privacy-share">When it's shared</a><a href="#privacy-control">Your choices</a><a href="#privacy-contact">Questions</a><small>Updated 22 November 2026</small></aside><article>
        <p>This policy describes the current VerifiedNG experience. Please review it before creating an account. Public posts and listings should not include information you would prefer to keep private.</p>
        <section id="privacy-collect"><h2>Information we collect</h2><p>When you register, you provide a name, email address, phone number and password. You may also add a profile photo, city or state, skills and professional details. We store passwords in hashed form rather than as readable passwords.</p><p>We store community posts, photos or videos you upload, reactions, comments, listings, group activity, messages, reports, provider or verification applications and support enquiries when you use those features. We also process login and service activity required to keep accounts working and protect the platform.</p></section>
        <section id="privacy-use"><h2>How we use your information</h2><p>We use the information to operate accounts, provide relevant community and location-based discovery, show public posts and profiles, facilitate messaging, process applications, investigate reports, respond to enquiries and improve reliability and safety.</p><p>Using approximate distance is optional. When you choose it, the app may request location permission to calculate nearby results; don't assume an approximate point hides every detail about your location.</p></section>
        <section id="privacy-share"><h2>Where information is visible</h2><p>Posts shared publicly can be viewed by signed-in members across Nigeria. Public listings and service profiles can expose their content and general location. Messages are intended for their conversation participants and may be accessed where necessary to address safety, legal or service issues.</p><p>We use infrastructure and delivery services to operate VerifiedNG, including hosting, database, email and media-storage providers. For example, uploaded media may be stored through Cloudinary. We do not claim that using the platform makes all submitted information private.</p></section>
        <section id="privacy-control"><h2>Your choices and retention</h2><p>You can change supported profile details, choose whether to use optional location features and delete posts or listings where that control is available. Account deletion is available in the account experience; some information may need to be retained where legally required or for legitimate safety and security purposes.</p><p>If you want to request access, correction or deletion of information that you cannot change in-app, contact us using the form below. We may need to verify that the request relates to your own account.</p></section>
        <section id="privacy-contact"><h2>Questions about your information?</h2><p>Use the <a href="/contact">VerifiedNG contact form</a> and select “Privacy or data”. We'll use the details you provide to review your request.</p></section>
        <p className="public-policy-disclaimer">This policy is an operational draft for the current service and should be reviewed for legal compliance before wider public launch.</p>
      </article></div>
    </main>}
    {page === "terms" && <main className="public-info-main public-container"><PageHeading eyebrow="THE COMMUNITY RULES" title="Terms of Service" description="The terms for joining and using VerifiedNG, written to make the main expectations clear."/>
      <div className="public-policy-layout"><aside><strong>Sections</strong><a href="#terms-account">Accounts</a><a href="#terms-content">Content</a><a href="#terms-marketplace">Services & listings</a><a href="#terms-safety">Safety</a><a href="#terms-change">Changes & contact</a><small>Updated 22 November 2026</small></aside><article>
        <p>By creating an account and using VerifiedNG, you agree to use the platform responsibly and comply with applicable laws. If you do not agree with these terms, do not use the service.</p>
        <section id="terms-account"><h2>Accounts and eligibility</h2><p>Provide accurate account information, protect your password and do not impersonate another person. You are responsible for activity on your account. Provider applications are reviewed and can be declined; registering does not grant provider or verified status.</p></section>
        <section id="terms-content"><h2>Posts, messages and community content</h2><p>You remain responsible for material you publish. Do not post harassment, threats, fraud, illegal content, content you have no right to share or another person's sensitive information. You allow VerifiedNG to display and process content you submit as necessary to provide its features, subject to your privacy choices and applicable law.</p><p>We may remove content, restrict features or suspend accounts when necessary to address safety, abuse, legal requirements or violations of these terms.</p></section>
        <section id="terms-marketplace"><h2>Marketplace and service providers</h2><p>VerifiedNG helps people discover listings and providers; it does not itself sell items or perform services offered by members. Buyers and sellers should independently check descriptions, quality, payment terms and suitability. A profile, review, verification indicator or application approval is not a guarantee of identity, safety or quality.</p></section>
        <section id="terms-safety"><h2>Safety and availability</h2><p>Use reasonable care in online and offline interactions. Report suspicious content rather than sharing sensitive information. We work to keep the service available and secure, but features may change, be unavailable or contain member-generated information that is inaccurate.</p></section>
        <section id="terms-change"><h2>Changes, questions and disputes</h2><p>We may update these terms as VerifiedNG develops. Significant changes should be communicated through the service where appropriate. Applicable rights under Nigerian law are not removed by these terms. For questions, use our <a href="/contact">contact form</a>.</p></section>
        <p className="public-policy-disclaimer">These are draft platform terms, not a substitute for legal review before a wider public launch.</p>
      </article></div>
    </main>}
    {page === "contact" && <main className="public-info-main public-container"><PageHeading eyebrow="WE'RE LISTENING" title="We're here to help." description="Have a question or problem? Send us a message."/>
      <div className="public-contact-layout"><div><span className="public-eyebrow">CONTACT VERIFIEDNG</span><h2>Tell us what's going on.</h2><p>Choose a topic and explain the issue. Please don't send passwords or secret codes.</p><div className="public-contact-aside"><div><ShieldCheck size={21}/><span><strong>Safety concern?</strong><small>For immediate danger, contact the appropriate local emergency service. The form isn't monitored for emergencies.</small></span></div><div><LockKeyhole size={21}/><span><strong>Privacy request?</strong><small>Select “Privacy or data” and describe your request. We may need to verify your identity before taking account-specific action.</small></span></div></div></div><ContactForm/></div>
    </main>}

    <footer className="public-footer"><div className="public-container"><div className="public-footer-main"><div className="public-footer-about"><a href="/"><Brand light/></a><p>Connecting people, places and opportunities across Nigeria. Built with community in mind.</p></div><div><strong>Explore</strong><a href="/#features">Explore features</a><a href="/become-a-provider">Become a provider</a><a href="/about">About VerifiedNG</a></div><div><strong>Trust & support</strong>{infoLinks.filter((x)=>x.href!=="/about").map((x)=><a key={x.href} href={x.href}>{x.label}</a>)}</div><div><strong>Get started</strong><a href={loggedIn ? "/app" : "/login"}>{loggedIn ? "Open community" : "Log in"}</a>{!loggedIn && <a href="/signup">Create an account</a>}<a href="/safety">Community safety</a></div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} VerifiedNG. Built for communities across Nigeria.</span><span>Community · Discovery · Trust</span></div></div></footer>
  </div>;
}
