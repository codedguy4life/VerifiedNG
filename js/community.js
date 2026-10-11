(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html?next=community.html";
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const state = { scope: "for-you", page: 1, limit: 10, hasMore: false, loading: false };
  const names = { "for-you": "For you", nearby: "Near me", nigeria: "Across Nigeria" };
  const list = $("#postsList");
  const feedMessage = $("#feedMessage");
  const postForm = $("#postForm");
  const postText = $("#postText");
  const toast = $("#toast");
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();

  $("#currentName").textContent = user?.fullName || "Your community";
  const avatar = $("#currentAvatar");
  if (user?.profilePhoto) avatar.innerHTML = `<img src="${escapeAttribute(user.profilePhoto)}" alt="">`;
  else avatar.textContent = (user?.fullName || "V").trim().charAt(0).toUpperCase();
  postText.addEventListener("input", () => { $("#characterCount").textContent = postText.value.length + "/2000"; });

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }
  function escapeAttribute(value) { return escapeHtml(value); }
  function initials(name) { return String(name || "V").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase(); }
  function timeAgo(value) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return "just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
    return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  async function api(path, options = {}) {
    const response = await fetch(API_URL + path, {
      ...options,
      headers: { Authorization: "Bearer " + token, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2800);
  }
  function renderPost(post) {
    const author = post.author || {};
    const authorName = author.fullName || "VerifiedNG member";
    const photo = author.profilePhoto ? `<img src="${escapeAttribute(author.profilePhoto)}" alt="">` : escapeHtml(initials(authorName));
    const location = [post.location?.city, post.location?.state].filter(Boolean).join(", ");
    const comments = (post.comments || []).map((comment) => `<div class="comment-item"><strong>${escapeHtml(comment.author?.fullName || "Member")}</strong>${escapeHtml(comment.text)} <span class="post-meta">${timeAgo(comment.createdAt)}</span></div>`).join("");
    return `<article class="post-card" data-post-id="${escapeAttribute(post._id)}">
      <div class="post-head"><div class="avatar">${photo}</div><div class="post-identity"><strong>${escapeHtml(authorName)} ${author.isVerified ? '<i class="bi bi-patch-check-fill verified-mark" title="Verified provider"></i>' : ""}</strong><div class="post-meta"><span>${timeAgo(post.createdAt)}</span><span>·</span><span>${post.audience === "local" ? "Local community" : "Across Nigeria"}</span>${location ? `<span>·</span><span>${escapeHtml(location)}</span>` : ""}</div></div>
      <button class="post-menu" type="button" data-action="report-toggle" aria-label="Report post"><i class="bi bi-flag"></i></button></div>
      <span class="category-chip">${escapeHtml(post.category || "General")}</span>
      <p class="post-text">${escapeHtml(post.text)}</p>
      <div class="post-actions"><button class="post-action ${post.reactedByMe ? "reacted" : ""}" type="button" data-action="react"><i class="bi ${post.reactedByMe ? "bi-heart-fill" : "bi-heart"}"></i><span>${post.reactionCount || 0} helpful</span></button>
      <button class="post-action" type="button" data-action="comments"><i class="bi bi-chat"></i><span>${post.commentCount || 0} comments</span></button>
      ${String(author._id || author.id || "") === String(user?.id || user?._id || "") ? '<button class="post-action" type="button" data-action="edit"><i class="bi bi-pencil"></i><span>Edit</span></button><button class="post-action" type="button" data-action="delete"><i class="bi bi-trash3"></i><span>Delete</span></button>' : ""}</div>
      <div class="comment-area hidden"><div class="comment-list">${comments || '<p class="post-meta">No comments yet. Start the conversation.</p>'}</div>
        <form class="comment-form"><input name="comment" maxlength="1000" placeholder="Write a thoughtful reply…" aria-label="Write a comment" required><button type="submit" aria-label="Send comment"><i class="bi bi-send"></i></button></form></div>
      <form class="report-form hidden"><select name="reason" aria-label="Report reason" required><option value="">Choose a reason</option><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="scam">Scam or fraud</option><option value="misinformation">Misinformation</option><option value="other">Other</option></select><input name="details" maxlength="500" placeholder="Optional details" aria-label="Report details"><button type="submit">Send report</button></form>
    </article>`;
  }
  async function loadFeed({ append = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    if (!append) {
      state.page = 1;
      list.innerHTML = "";
      feedMessage.classList.remove("hidden", "error");
      feedMessage.textContent = "Loading your community…";
    }
    try {
      const data = await api(`/api/community/feed?scope=${encodeURIComponent(state.scope)}&page=${state.page}&limit=${state.limit}`);
      const html = (data.posts || []).map(renderPost).join("");
      if (append) list.insertAdjacentHTML("beforeend", html);
      else list.innerHTML = html;
      state.hasMore = Boolean(data.hasMore);
      $("#feedTitle").textContent = names[state.scope];
      $("#feedDescription").textContent = state.scope === "nearby" ? "Posts from your area, plus national conversations" : state.scope === "nigeria" ? "Conversations shared with people across Nigeria" : "Useful conversations from your community";
      feedMessage.classList.toggle("hidden", Boolean(data.posts?.length));
      if (!data.posts?.length) feedMessage.textContent = state.scope === "nearby" ? "No local posts yet. Start a conversation and help your community get moving." : "Nothing here just yet. Be the first to share something useful.";
      $("#loadMoreButton").classList.toggle("hidden", !state.hasMore);
      $("#loadMoreTop").classList.toggle("hidden", !state.hasMore);
    } catch (error) {
      feedMessage.classList.remove("hidden");
      feedMessage.classList.add("error");
      feedMessage.textContent = error.message;
    } finally { state.loading = false; }
  }

  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = postForm.querySelector('button[type="submit"]');
    button.disabled = true;
    $("#composerMessage").textContent = "Publishing…";
    try {
      await api("/api/community/posts", { method: "POST", body: JSON.stringify({ text: postText.value, category: $("#postCategory").value, audience: $("#postAudience").value }) });
      postText.value = "";
      $("#characterCount").textContent = "0/2000";
      $("#composerMessage").textContent = "Your post is live.";
      if (state.scope !== "nigeria" || $("#postAudience").value === "national") await loadFeed();
      else notify("Post published. Switch to For you or Near me to see local posts.");
      notify("Your post has been published.");
    } catch (error) { $("#composerMessage").textContent = error.message; }
    finally { button.disabled = false; }
  });

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest("[data-post-id]");
    if (!card) return;
    const id = card.dataset.postId;
    const action = button.dataset.action;
    if (action === "comments") { card.querySelector(".comment-area").classList.toggle("hidden"); return; }
    if (action === "report-toggle") { card.querySelector(".report-form").classList.toggle("hidden"); return; }
    if (action === "react") {
      button.disabled = true;
      try { await api(`/api/community/posts/${encodeURIComponent(id)}/reactions`, { method: "POST", body: JSON.stringify({}) }); await loadFeed(); }
      catch (error) { notify(error.message); }
      finally { button.disabled = false; }
    }
    if (action === "edit") {
      const currentText = card.querySelector(".post-text")?.textContent || "";
      const editedText = window.prompt("Edit your post", currentText);
      if (editedText === null || !editedText.trim()) return;
      try { await api(`/api/community/posts/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ text: editedText, category: card.querySelector(".category-chip")?.textContent || "General" }) }); await loadFeed(); notify("Post updated."); }
      catch (error) { notify(error.message); }
    }
    if (action === "delete") {
      if (!window.confirm("Delete this post? This cannot be undone.")) return;
      try { await api(`/api/community/posts/${encodeURIComponent(id)}`, { method: "DELETE" }); card.remove(); notify("Post deleted."); }
      catch (error) { notify(error.message); }
    }
  });

  list.addEventListener("submit", async (event) => {
    const form = event.target;
    const card = form.closest("[data-post-id]");
    if (!card) return;
    event.preventDefault();
    const id = card.dataset.postId;
    const submit = form.querySelector('button[type="submit"]');
    if (form.classList.contains("comment-form")) {
      const input = form.elements.comment;
      const text = input.value.trim();
      if (!text) return;
      submit.disabled = true;
      try { await api(`/api/community/posts/${encodeURIComponent(id)}/comments`, { method: "POST", body: JSON.stringify({ text }) }); await loadFeed(); const refreshed = list.querySelector(`[data-post-id="${CSS.escape(id)}"]`); refreshed?.querySelector(".comment-area")?.classList.remove("hidden"); }
      catch (error) { notify(error.message); }
      finally { submit.disabled = false; }
    } else if (form.classList.contains("report-form")) {
      submit.disabled = true;
      try { await api(`/api/community/posts/${encodeURIComponent(id)}/reports`, { method: "POST", body: JSON.stringify({ reason: form.elements.reason.value, details: form.elements.details.value }) }); form.classList.add("hidden"); notify("Thanks. Your report has been sent for review."); }
      catch (error) { notify(error.message); }
      finally { submit.disabled = false; }
    }
  });

  document.querySelectorAll("[data-scope]").forEach((button) => button.addEventListener("click", () => {
    state.scope = button.dataset.scope;
    document.querySelectorAll("[data-scope]").forEach((item) => item.classList.toggle("active", item === button));
    loadFeed();
  }));
  $("#refreshFeed").addEventListener("click", () => loadFeed());
  $("#loadMoreButton").addEventListener("click", () => { if (state.hasMore && !state.loading) { state.page += 1; loadFeed({ append: true }); } });
  $("#loadMoreTop").addEventListener("click", () => { if (state.hasMore && !state.loading) { state.page += 1; loadFeed({ append: true }); } });
  $("#signOutButton").addEventListener("click", () => { if (typeof signOut === "function") signOut(); else { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "login.html"; } });

  loadFeed();
})();
