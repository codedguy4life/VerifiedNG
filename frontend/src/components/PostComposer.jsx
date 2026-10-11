import { useState } from "react";
import { Globe2, Send, Tag } from "lucide-react";

const categories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];

export default function PostComposer({ user, onPublish, busy }) {
  return <ComposerForm user={user} onPublish={onPublish} busy={busy} />;
}


function ComposerForm({ user, onPublish, busy }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("national");
  async function submit(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    const published = await onPublish({ text: text.trim(), category, audience });
    if (published) setText("");
  }
  return (
    <section className="composer card" id="composer">
      <div className="composer-person">
        <div className="avatar">{user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials(user?.fullName)}</div>
        <div><strong>{user?.fullName || "Your community"}</strong><span>Share something useful with people</span></div>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="post-text">Write a post</label>
        <textarea id="post-text" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder="What's happening? Ask a question, share an opportunity, or recommend a service..." required />
        <div className="composer-options">
          <label className="select-field"><Tag size={15} /><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-field"><Globe2 size={15} /><span className="sr-only">Audience</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="national">Across Nigeria</option><option value="local">My area</option></select></label>
          <span className="character-count">{text.length}/2000</span>
          <button className="primary-button" type="submit" disabled={busy || !text.trim()}><Send size={15} /> {busy ? "Publishing…" : "Publish"}</button>
        </div>
      </form>
    </section>
  );
}

function initials(name = "V") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
