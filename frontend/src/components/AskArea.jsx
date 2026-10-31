import { useState } from "react";
import { ArrowRight, MapPin, Search, Sparkles, WandSparkles } from "lucide-react";
import { api } from "../lib/api.js";

const suggestions = ["Nice dinner place", "Electrician", "A phone for sale"];

export default function AskArea({ area, onOpenProvider, onExplore }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = (area || "your area").split(",")[0].trim();
  async function ask(text) {
    const clean = String(text || question).trim();
    if (clean.length < 3) return;
    setQuestion(clean); setBusy(true); setError(""); setResponse(null);
    try {
      const result = await api("/api/discovery/ask", { method: "POST", body: JSON.stringify({ question: clean }) });
      setResponse(result);
    } catch (cause) { setError(cause.message || "Could not search your community."); }
    finally { setBusy(false); }
  }
  function go(item) {
    if (item.type === "providers") onOpenProvider?.(item._id);
    else onExplore?.(item.type === "sale" ? "sale" : "groups", item);
  }
  return (
    <section className="ask-area">
      <div className="ask-area-heading">
        <span className="ask-area-symbol"><Sparkles size={19}/></span>
        <div><h3>Ask {title}</h3><p>Tell us what you need. Get matches from real VerifiedNG listings.</p></div>
        <span className="ask-area-label">SMART SEARCH</span>
      </div>
      <form className="ask-area-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
        <label className="ask-area-input"><Search size={15}/><span className="sr-only">Ask your community</span>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={200} placeholder="e.g. A nice dinner place near me" />
        </label>
        <button type="submit" disabled={busy || question.trim().length < 3}>Ask <ArrowRight size={14}/></button>
      </form>
      <div className="ask-area-chips">
        {suggestions.map((term) => <button key={term} type="button" onClick={() => ask(term)} disabled={busy}>{term}</button>)}
        <button type="button" className="ask-area-pick" disabled={busy} onClick={() => ask(question.trim() || "Dinner restaurant") }><WandSparkles size={13}/> Choose for me</button>
      </div>
      {busy && <p role="status" className="ask-area-status">Looking through VerifiedNG listings…</p>}
      {error && <p role="alert" className="marketplace-error">{error}</p>}
      {response && <div className="ask-area-results" aria-live="polite">
        <p className="ask-area-answer"><Sparkles size={15}/>{response.answer}</p>
        {response.results?.length > 0 && <div className="ask-area-result-list">
          {response.results.map((item) => (
            <button key={item.type + item._id} type="button" onClick={() => go(item)}>
              <span className="ask-area-result-title"><strong>{item.fullName || item.title || item.name}</strong><small>{item.type === "providers" ? "Provider" : item.type === "sale" ? "For Sale" : "Group"}</small></span>
              <span className="ask-area-result-sub"><MapPin size={12}/>{[item.city, item.state].filter(Boolean).join(", ") || response.area}{item.type === "sale" ? " · ₦" + Number(item.price).toLocaleString("en-NG") : ""}</span>
              <ArrowRight size={15}/>
            </button>
          ))}
        </div>}
        <small>Based on saved VerifiedNG data, not a generative AI response or independently verified recommendation.</small>
      </div>}
    </section>
  );
}
