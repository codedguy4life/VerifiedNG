import { useEffect, useRef, useState } from "react";
import { Globe2, ImagePlus, Send, Settings2, Tag, Video, X } from "lucide-react";

const categories = ["General", "Question", "Opportunity", "Recommendation", "Service Request", "Safety Alert"];

export default function PostComposer({ user, onPublish, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [audience, setAudience] = useState("local");
  const [showSettings, setShowSettings] = useState(false);
  const [mediaNotice, setMediaNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedFile) { setPreviewUrl(""); return undefined; }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function chooseMedia(kind) {
    setExpanded(true); setMediaNotice("");
    if (fileInputRef.current) { fileInputRef.current.accept = kind === "image" ? "image/*" : "video/*"; fileInputRef.current.click(); }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!(file.type.startsWith("image/") || isVideo)) { setMediaNotice("Choose an image or video file."); event.target.value = ""; return; }
    if (file.size > maxBytes) { setMediaNotice(isVideo ? "Videos must be 25 MB or smaller." : "Images must be 8 MB or smaller."); event.target.value = ""; return; }
    setSelectedFile(file); setMediaNotice("");
  }

  async function uploadSelectedMedia() {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Media storage is not configured yet. Add the Cloudinary settings before uploading.");
    const resourceType = selectedFile.type.startsWith("video/") ? "video" : "image";
    const formData = new FormData(); formData.append("file", selectedFile); formData.append("upload_preset", uploadPreset);
    const response = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/upload", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Could not upload this file. Please try again.");
    return resourceType === "video" ? { videoUrl: result.secure_url } : { imageUrl: result.secure_url };
  }

  async function submit(event) {
    event.preventDefault();
    if ((!text.trim() && !selectedFile) || busy || uploadingMedia) return;
    setMediaNotice(""); let media = {};
    if (selectedFile) {
      setUploadingMedia(true);
      try { media = await uploadSelectedMedia(); }
      catch (cause) { setMediaNotice(cause.message || "Could not upload your file."); setUploadingMedia(false); return; }
      setUploadingMedia(false);
    }
    const published = await onPublish({ text: text.trim(), category, audience, ...media });
    if (published) {
      setText("");
      setExpanded(false);
      setShowSettings(false);
      setMediaNotice("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            <button className="media-option" type="button" aria-label="Add photo" title="Add photo" onClick={() => chooseMedia("image") }>
              <ImagePlus size={18} /><span>Photo</span>
            </button>
            <button className="media-option" type="button" aria-label="Add video" title="Add video" onClick={() => chooseMedia("video") }>
              <Video size={18} /><span>Video</span>
            </button>
          </div>
          {expanded && <span className="character-count">{text.length}/2000</span>}
          <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
          {expanded && <button className="composer-cancel" type="button" aria-label="Close composer" onClick={() => { if (!text.trim() || window.confirm("Discard your draft?")) { setExpanded(false); setShowSettings(false); setMediaNotice(""); } }}><X size={16} /></button>}
          {expanded && <button className="primary-button composer-submit" type="submit" disabled={busy || uploadingMedia || (!text.trim() && !selectedFile)}><Send size={14} />{uploadingMedia ? "Uploading…" : busy ? "Posting…" : "Post"}</button>}
        </div>

        {previewUrl && <div className="composer-media-preview">{selectedFile?.type.startsWith("video/") ? <video controls src={previewUrl} /> : <img src={previewUrl} alt="Preview of your post attachment" />}<span>{selectedFile?.name}</span><button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remove attachment">Remove</button></div>}
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
