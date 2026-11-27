// Search and navigation for the restored classic landing page.
function goToSearch(service="",location=""){const p=new URLSearchParams({view:"search",tab:"providers"});if(service.trim())p.set("service",service.trim().slice(0,80));if(location.trim())p.set("location",location.trim().slice(0,80));window.location.assign("/app?"+p);}
function handleNavSearch(){goToSearch(document.getElementById("navServiceInput")?.value||"");}
function handleSearch(){goToSearch(document.getElementById("serviceInput")?.value||"",document.getElementById("locationInput")?.value||"");}
function goToProviderSignup(){window.location.assign(localStorage.getItem("token")?"/app?view=provider-apply":"/become-a-provider");}
document.addEventListener("DOMContentLoaded",()=>{for(const [id,fn] of [["navServiceInput",handleNavSearch],["serviceInput",handleSearch],["locationInput",handleSearch]])document.getElementById(id)?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();fn();}});const nav=document.querySelector(".nav-actions");if(nav&&localStorage.getItem("token")){nav.replaceChildren();const a=document.createElement("a");a.className="btn-primary";a.href="/app";a.textContent="Go to Community";nav.append(a);}});

// Show real APPROVED providers using the backend's public, privacy-limited
// directory. No fabricated ratings, testimonials or contact details.
async function loadHomepageProviders() {
  const container = document.getElementById("homepageProviders");
  if (!container) return;
  const safeLink = () => {
    const note = document.createElement("p");
    note.className = "home-provider-note";
    note.append("Browse approved service providers in our ");
    const a = document.createElement("a");
    a.href = "/app?view=providers";
    a.textContent = "provider directory";
    note.append(a, ".");
    container.replaceChildren(note);
  };
  const host = window.location.hostname;
  const base = ["localhost", "127.0.0.1"].includes(host)
    ? "http://" + host + ":5000"
    : "https://verifiedng-backend.onrender.com";
  try {
    const response = await fetch(base + "/api/providers", { method: "GET", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Provider list unavailable");
    const payload = await response.json();
    const providers = (Array.isArray(payload.providers) ? payload.providers : [])
      .filter((item) => /^[a-f0-9]{24}$/i.test(String(item?._id || "")))
      .slice(0, 3);
    if (!providers.length) return safeLink();

    const cards = providers.map((person) => {
      const card = document.createElement("a");
      card.className = "home-provider-card";
      const id = String(person._id);
      card.href = "/app?view=provider-profile&provider=" + encodeURIComponent(id) + "&from=providers";
      const badge = document.createElement("span");
      badge.className = "home-provider-badge";
      badge.textContent = person.isVerified ? "Community verified" : "Provider profile";
      const heading = document.createElement("strong");
      heading.textContent = String(person.fullName || "Service provider").slice(0, 100);
      const job = document.createElement("span");
      job.className = "home-provider-job";
      job.textContent = String(person.category || "Local services").slice(0, 80);
      const area = document.createElement("small");
      area.textContent = [person.city, person.state].filter(Boolean).join(", ").slice(0, 140) || "Nigeria";
      const bio = document.createElement("p");
      bio.textContent = String(person.bio || "View their details and ask about their work.").slice(0, 140);
      const action = document.createElement("span");
      action.className = "home-provider-action";
      action.textContent = "View profile →";
      card.append(badge, heading, job, area, bio, action);
      return card;
    });
    container.replaceChildren(...cards);
  } catch (_error) {
    // When the server is unavailable (including on a preview with no allowed
    // backend origin), show a helpful link instead of an empty or fake card.
    safeLink();
  }
}
document.addEventListener("DOMContentLoaded", loadHomepageProviders);
