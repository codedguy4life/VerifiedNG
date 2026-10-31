import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, MapPin, Plus, Search, Send, ShieldCheck, Users, X } from "lucide-react";
import { api } from "../lib/api.js";
import PostCard from "./PostCard.jsx";

const categories = ["General", "Neighbourhood", "Business", "Learning", "Family", "Sports", "Interests"];
const location = (group) => [group.city, group.state].filter(Boolean).join(", ") || "Across Nigeria";

export default function GroupsPage({ user, onOpenVerification }) {
  const [verified, setVerified] = useState(Boolean(user?.isVerified));
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [posts, setPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api("/api/groups?search=" + encodeURIComponent(search));
      setGroups(response.groups || []);
    } catch (cause) { setError(cause.message || "Could not load groups."); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const handle = setTimeout(() => { loadGroups(); }, search ? 250 : 0);
    return () => clearTimeout(handle);
  }, [loadGroups]);

  useEffect(() => {
    let active = true;
    api("/api/verification/status")
      .then((data) => { if (active) setVerified(Boolean(data.verified)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function openGroup(id) {
    setError(""); setMessage(""); setPosts([]); setSelected(null); setPage(1);
    try {
      const response = await api("/api/groups/" + encodeURIComponent(id));
      setSelected(response.group);
      if (response.group.isMember && verified) await loadPosts(id, 1);
    } catch (cause) { setError(cause.message || "Could not load group."); }
  }

  async function loadPosts(id, targetPage = 1) {
    setPostsLoading(true);
    try {
      const response = await api("/api/groups/" + encodeURIComponent(id) + "/posts?page=" + targetPage);
      setPosts((current) => targetPage === 1 ? response.posts || [] : [...current, ...(response.posts || [])]);
      setPage(targetPage);
      setHasMore(Boolean(response.hasMore));
    } catch (cause) { setError(cause.message || "Could not load group posts."); }
    finally { setPostsLoading(false); }
  }

  async function create(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await api("/api/groups", {
        method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim(), category }),
      });
      setCreateOpen(false); setName(""); setDescription(""); setCategory("General");
      await loadGroups();
      await openGroup(data.group._id);
      setMessage("Your group is ready.");
    } catch (cause) { setError(cause.message || "Could not create group."); }
    finally { setBusy(false); }
  }

  async function join() {
    if (!selected) return;
    if (!verified) { onOpenVerification(); return; }
    setBusy(true); setError("");
    try {
      await api("/api/groups/" + encodeURIComponent(selected._id) + "/join", { method: "POST", body: "{}" });
      setSelected((value) => ({ ...value, isMember: true, memberCount: value.memberCount + 1 }));
      await loadPosts(selected._id, 1);
      setMessage("You joined " + selected.name + ".");
    } catch (cause) { setError(cause.message || "Could not join group."); }
    finally { setBusy(false); }
  }

  async function leave() {
    if (!selected || !window.confirm("Leave this group?")) return;
    setBusy(true); setError("");
    try {
      await api("/api/groups/" + encodeURIComponent(selected._id) + "/leave", { method: "POST", body: "{}" });
      setSelected((value) => ({ ...value, isMember: false, memberCount: Math.max(0, value.memberCount - 1) }));
      setPosts([]);
    } catch (cause) { setError(cause.message || "Could not leave group."); }
    finally { setBusy(false); }
  }

  async function publish(event) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await api("/api/groups/" + encodeURIComponent(selected._id) + "/posts", {
        method: "POST", body: JSON.stringify({ text: draft.trim() }),
      });
      setDraft("");
      await loadPosts(selected._id, 1);
      setMessage("Posted to your group.");
    } catch (cause) { setError(cause.message || "Could not publish post."); }
    finally { setBusy(false); }
  }

  async function act(path, method = "POST", body = {}) {
    if (!selected) return false;
    try {
      await api("/api/groups/" + encodeURIComponent(selected._id) + "/posts/" + path, {
        method, ...(method !== "DELETE" ? { body: JSON.stringify(body) } : {}),
      });
      await loadPosts(selected._id, 1);
      return true;
    } catch (cause) { setError(cause.message || "Could not update post."); return false; }
  }
  async function edit(post) {
    const text = window.prompt("Edit your group post", post.text);
    if (text === null || !text.trim()) return;
    await act(encodeURIComponent(post._id), "PUT", { text: text.trim() });
  }
  async function remove(id) {
    if (window.confirm("Remove this post?")) await act(encodeURIComponent(id), "DELETE");
  }

  return (
    <div className="groups-page">
      <div className="groups-verification-banner">
        {verified ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
        <span>{verified ? "You're verified. You can create and join groups." : "Verification is required to join groups, create groups and post."}</span>
        {!verified && <button type="button" onClick={onOpenVerification}>Get verified <ArrowRight size={14}/></button>}
      </div>
      {error && <p className="marketplace-error" role="alert">{error} <button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={13}/></button></p>}
      {message && <p className="groups-success" role="status"><CheckCircle2 size={15}/> {message}</p>}
      {selected ? (
        <>
          <button type="button" className="groups-back" onClick={() => { setSelected(null); setDraft(""); setMessage(""); loadGroups(); }}><ArrowLeft size={15}/> All groups</button>
          <header className="groups-detail-head">
            <span className="groups-symbol"><Users size={25}/></span>
            <div className="groups-detail-text">
              <small>{selected.category}</small>
              <h2>{selected.name}</h2>
              <p>{selected.description || "A community group on VerifiedNG."}</p>
              <span><MapPin size={13} /> {location(selected)} · {selected.memberCount} member{selected.memberCount === 1 ? "" : "s"}</span>
            </div>
          </header>
          <div className="groups-join-area">
            {selected.isMember && verified ? (
              <><span className="groups-joined"><CheckCircle2 size={15}/> Joined</span>
                {String(selected.creator?._id || selected.creator) !== String(user?._id || user?.id) && <button type="button" onClick={leave} disabled={busy}>Leave group</button>}</>
            ) : <button className="groups-join-button" type="button" onClick={join} disabled={busy}>{verified ? "Join this group" : "Verify to join"} <ArrowRight size={15}/></button>}
          </div>
          {selected.isMember && verified ? (
            <>
              <form className="groups-composer card" onSubmit={publish}>
                <label htmlFor="group-post">Share with {selected.name}</label>
                <textarea id="group-post" rows={3} maxLength={2000} value={draft} placeholder="Write something for the group…" onChange={(event) => setDraft(event.target.value)} />
                <div><small>{draft.length}/2000</small><button type="submit" disabled={busy || !draft.trim()}><Send size={14}/> Post</button></div>
              </form>
              <div className="groups-feed" aria-label="Group discussions">
                {postsLoading && posts.length === 0 && <p className="muted small">Loading group posts…</p>}
                {!postsLoading && posts.length === 0 && <div className="groups-empty"><Users size={23}/><strong>No posts yet</strong><p>Start the conversation with your group.</p></div>}
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} currentUser={user}
                    onReach={(id) => act(encodeURIComponent(id) + "/reactions")}
                    onComment={(id, text) => act(encodeURIComponent(id) + "/comments", "POST", { text })}
                    onEdit={edit} onDelete={remove}
                    onReport={(id, data) => act(encodeURIComponent(id) + "/reports", "POST", data)}
                  />
                ))}
                {hasMore && <button className="marketplace-loadmore" type="button" disabled={postsLoading} onClick={() => loadPosts(selected._id, page + 1)}>Load more posts <ArrowRight size={15}/></button>}
              </div>
            </>
          ) : <div className="groups-locked"><LockKeyhole size={25}/><strong>Members-only discussions</strong><p>{verified ? "Join the group to read and participate in its discussions." : "Get verified, then join to see group discussions."}</p></div>}
        </>
      ) : (
        <>
          <div className="groups-directory-controls">
            <label className="marketplace-search"><Search size={17}/><span className="sr-only">Find groups</span><input type="search" value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups…" /></label>
            <button className="groups-add" type="button" onClick={() => verified ? setCreateOpen(true) : onOpenVerification()}><Plus size={18}/> <span>Create</span></button>
          </div>
          {loading ? <p className="muted small">Loading groups…</p> : groups.length === 0 ? (
            <div className="groups-empty"><Users size={26}/><strong>No groups yet</strong><p>Verified members can start the first discussion group in their community.</p></div>
          ) : <div className="groups-directory">
            {groups.map((group) => <button key={group._id} className="groups-list-card" type="button" onClick={() => openGroup(group._id)}>
              <span className="groups-symbol"><Users size={20}/></span>
              <span className="groups-list-details"><strong>{group.name}</strong><small>{group.category} · {location(group)}</small><span>{group.description || "Join a neighbourhood discussion."}</span><small>{group.memberCount} members {group.isMember ? "· Joined" : ""}</small></span>
              <ArrowRight size={18}/>
            </button>)}
          </div>}
        </>
      )}
      {createOpen && (
        <div className="marketplace-dialog">
          <section className="groups-create" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
            <header><h2 id="create-group-title">Create a group</h2><button type="button" aria-label="Close" onClick={() => setCreateOpen(false)}><X size={19}/></button></header>
            <form onSubmit={create}>
              <label>Group name<input required minLength={3} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ikeja Neighbours"/></label>
              <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Description<textarea rows={3} maxLength={750} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is the group about?"/></label>
              <p>The group will show your saved city/state. Group discussions are accessible only to verified members who join.</p>
              <button type="submit" className="groups-join-button" disabled={busy}>{busy ? "Creating…" : "Create group"} <Plus size={15}/></button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
