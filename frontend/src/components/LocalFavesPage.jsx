import { useState } from "react";
import { ArrowRight, Heart, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { api } from "../lib/api.js";

const suggestions = ["Where can I eat nearby?", "Recommend an electrician", "Any good groups near me?", "Find a used phone"];
export default function LocalFavesPage({ area = "", onOpenResult }) {
  const [question, setQuestion] = useState("");
  const [conversation, setConversation] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function ask(value) {
    const text = String(value || question).trim();
    if (text.length < 3 || busy) return;
    setBusy(true); setError(""); setQuestion("");
    try {
      const answer = await api("/api/discovery/ask", {
        method: "POST", body: JSON.stringify({ question: text }),
      });
      setConversation((items) => [...items, { question: text, answer }]);
    } catch (cause) {
      setQuestion(text);
      setError(cause.message || "Couldn't search your area. Try again.");
    } finally { setBusy(false); }
  }
  return (
    <section className="local-faves-page" aria-label="Local Faves assistant">
      <div className="local-faves-intro">
        <span className="local-faves-symbol"><Heart size={22} fill="currentColor" /></span>
        <div><span className="eyebrow">YOUR LOCAL GUIDE</span>
          <h1>Local Faves</h1>
          <p>Ask about places, services, things for sale or groups. We'll suggest matches from the real VerifiedNG community.</p>
          <small><MapPin size={13}/> {area || "Across Nigeria"} · Suggestions use your saved profile area</small>
        </div>
      </div>
      {conversation.length === 0 && <div className="local-faves-chips">
        {suggestions.map((prompt) => <button key={prompt} type="button" onClick={() => ask(prompt)} disabled={busy}>{prompt}<ArrowRight size={14}/></button>)}
      </div>}
      <div className="local-faves-conversation" aria-live="polite">
        {conversation.map((turn, index) => <div className="local-faves-turn" key={index}>
          <p className="local-faves-question">{turn.question}</p>
          <div className="local-faves-reply"><span className="local-faves-answer-icon"><Sparkles size={16}/></span>
            <div className="local-faves-answer"><p>{turn.answer.answer}</p>
              {turn.answer.results?.length > 0 && <div className="local-faves-results">
                {turn.answer.results.map((item) => <button key={item.type + item._id} type="button" onClick={() => onOpenResult?.(item)}>
                  <strong>{item.fullName || item.title || item.name}</strong>
                  <small>{item.type === "providers" ? "Provider" : item.type === "sale" ? "For Sale" : "Community group"} · {[item.city, item.state].filter(Boolean).join(", ") || turn.answer.area}</small>
                  <ArrowRight size={16}/>
                </button>)}
              </div>}
              <small>Suggestions are based on VerifiedNG records, not independent reviews or an AI-generated answer. Check details before making arrangements.</small>
            </div>
          </div>
        </div>)}
      </div>
      {busy && <p className="local-faves-busy" role="status"><Sparkles size={15}/> Searching real local results…</p>}
      {error && <p className="marketplace-error" role="alert">{error}</p>}
      <form className="local-faves-form" onSubmit={(event) => { event.preventDefault(); ask(); }}>
        <MessageCircle size={20} aria-hidden="true"/>
        <label className="sr-only" htmlFor="local-faves-question">Ask Local Faves</label>
        <input id="local-faves-question" value={question} maxLength={200} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything about your area…" />
        <button type="submit" disabled={busy || question.trim().length < 3} aria-label="Send question"><ArrowRight size={20}/></button>
      </form>
      <p className="local-faves-footnote">No invented businesses or reviews. AI-generated wording can be added later with a configured, server-side AI service.</p>
    </section>
  );
}
