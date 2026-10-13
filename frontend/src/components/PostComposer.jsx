import { useState } from "react";
import { Globe2, ImagePlus, Send, Settings2, Tag, Video, X } from "lucide-react";

const categories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];

export default function PostComposer({ user, onPublish, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("local");
  const [showSettings, setShowSettings] = useState(false);
  const [mediaNotice, setMediaNotice] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    const published = await onPublish({ text: text.trim(), category, audience });
    if (published) {
      setText("");
      setExpanded(false);
      setShowSettings(false);
      setMediaNotice("");
    }
  }

  return (
    <section className={`composer card ${expanded ? "composer-expanded" : "composer-collapsed"}`} id="composer">
      <form onSubmit={submit}>
        <div className="composer-inline">
          <div className="composer-avatar avatar">
            {user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials(user?.fullName)}
          </div>
          {expanded ? (
            <label className="sr-only" htmlFor="post-text">Write a post</label>
          ) : null}
          {expanded ? (
            <textarea
              id="post-text"
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What's happening, famz?"
              autoFocus
              required
            />
          ) : (
            <button className="composer-prompt" type="button" onClick={() => setExpanded(true)}>
              What's happening, famz?
            </button>
          )}
          <button
            className={showSettings ? "composer-settings active" : "composer-settings"}
            type="button"
            aria-label="Post settings"
            aria-expanded={showSettings}
            title="Privacy and post settings"
            onClick={() => { setExpanded(true); setShowSettings((value) => !value); }}
          >
            <Settings2 size={18} />
          </button>
        </div>

        <div className="composer-toolbar">
          <div className="composer-media-actions">
            <button className="media-option" type="button" aria-label="Add photo" title="Add photo" onClick={() => { setExpanded(true); setMediaNotice("Photo uploads are not connected yet. Text posting is ready."); }}>
              <ImagePlus size={18} /><span>Photo</span>
            </button>
            <button className="media-option" type="button" aria-label="Add video" title="Add video" onClick={() => { setExpanded(true); setMediaNotice("Video uploads are not connected yet. Text posting is ready."); }}>
              <Video size={18} /><span>Video</span>
            </button>
          </div>
          {expanded && <span className="character-count">{text.length}/2000</span>}
          {expanded && <button className="composer-cancel" type="button" aria-label="Close composer" onClick={() => { if (!text.trim() || window.confirm("Discard your draft?")) { setExpanded(false); setShowSettings(false); setMediaNotice(""); } }}><X size={16} /></button>}
          {expanded && <button className="primary-button composer-submit" type="submit" disabled={busy || !text.trim()}><Send size={14} />{busy ? "Posting…" : "Post"}</button>}
        </div>

        {mediaNotice && <p className="media-notice" role="status">{mediaNotice}</p>}

        {expanded && showSettings && (
          <div className="composer-settings-panel">
            <label className="select-field"><Tag size={15} /><span className="sr-only">Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="select-field"><Globe2 size={15} /><span className="sr-only">Who can see this post?</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="local">My neighbourhood</option><option value="national">Across Nigeria</option></select></label>
          </div>
        )}
      </form>
    </section>
  );
}

function initials(name = "V") {
  return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
