import { useState } from "react";
import { Globe2, ImagePlus, Send, Tag, Video } from "lucide-react";

const categories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];

export default function PostComposer({ user, onPublish, busy }) {
  return <ComposerForm user={user} onPublish={onPublish} busy={busy} />;
}

function ComposerForm({ user, onPublish, busy }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("local");
  const [mediaNotice, setMediaNotice] = useState("");

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
        <div><strong>{user?.fullName || "Your community"}</strong><span>Share something with your neighbours</span></div>
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="post-text">Write a post</label>
        <textarea id="post-text" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder="What's happening around you?" required />
        {mediaNotice && <p className="media-notice" role="status">{mediaNotice}</p>}
        <div className="composer-bottom">
          <div className="composer-media-actions">
            <button className="media-option" type="button" onClick={() => setMediaNotice("Photo attachments are part of the next build step. Text posts are working now.")}><ImagePlus size={18} /><span>Photo</span></button>
            <button className="media-option" type="button" onClick={() => setMediaNotice("Video attachments are part of the next build step. Text posts are working now.")}><Video size={18} /><span>Video</span></button>
          </div>
          <span className="character-count">{text.length}/2000</span>
        </div>
        <div className="composer-options">
          <label className="select-field"><Tag size={15} /><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-field"><Globe2 size={15} /><span className="sr-only">Audience</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="local">My area</option><option value="national">Across Nigeria</option></select></label>
          <button className="primary-button" type="submit" disabled={busy || !text.trim()}><Send size={15} /> {busy ? "Publishing…" : "Post"}</button>
        </div>
      </form>
    </section>
  );
}

function initials(name = "V") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
