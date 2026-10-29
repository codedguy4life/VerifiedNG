import { useEffect, useState } from "react";
import { MapPin, Save, UserRound, X } from "lucide-react";
import { api } from "../lib/api.js";

const states = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "Federal Capital Territory", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

export default function ProfileEditor({ user, onClose, onSaved, postingBlocked = false }) {
  const [state, setState] = useState(user?.state || "");
  const [city, setCity] = useState(user?.city || "");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function save(event) {
    event.preventDefault();
    setError("");
    if (!state) {
      setError("Choose your Nigerian state or the FCT to continue.");
      return;
    }
    if (!fullName.trim()) {
      setError("Your full name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const result = await api("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          state,
          city: city.trim(),
          fullName: fullName.trim(),
          bio: bio.trim(),
        }),
      });
      onSaved(result.user);
    } catch (cause) {
      setError(cause.message || "Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-editor-overlay">
      <button className="profile-editor-scrim" type="button" aria-label="Close profile editor" onClick={onClose} />
      <section className="profile-editor-panel" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
        <header className="profile-editor-heading">
          <div className="profile-editor-heading-icon"><UserRound size={20} /></div>
          <div>
            <h2 id="profile-editor-title">{postingBlocked ? "Set your posting location" : "Edit your profile"}</h2>
            <p>{postingBlocked
              ? "Local posts need a saved location. Your photo and draft will stay ready while you update it."
              : "Keep your profile and neighbourhood details up to date."}</p>
          </div>
          <button type="button" className="profile-editor-close" aria-label="Close" onClick={onClose} disabled={saving}><X size={19} /></button>
        </header>
        <form onSubmit={save} className="profile-editor-form">
          <label>
            Full name
            <input autoComplete="name" value={fullName} maxLength={100} required onChange={(e) => setFullName(e.target.value)} />
          </label>
          <div className="profile-editor-fields">
            <label>
              State / FCT <span aria-hidden="true">*</span>
              <select value={state} required onChange={(e) => setState(e.target.value)}>
                <option value="">Choose state</option>
                {states.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              City / neighbourhood
              <input value={city} maxLength={80} placeholder="e.g. Ikeja" onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>
          <p className="profile-editor-privacy"><MapPin size={15} /> Your state and city may appear on your community posts. Never enter your full home address.</p>
          <label>
            About you <span className="profile-editor-optional">(optional)</span>
            <textarea value={bio} maxLength={1000} rows={3} placeholder="Tell your neighbours a little about yourself" onChange={(e) => setBio(e.target.value)} />
          </label>
          {error && <p className="profile-editor-error" role="alert">{error}</p>}
          <div className="profile-editor-actions">
            <button type="button" className="profile-editor-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}><Save size={16} /> {saving ? "Saving…" : "Save profile"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
