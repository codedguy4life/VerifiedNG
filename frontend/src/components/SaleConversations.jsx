import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { api } from "../lib/api.js";

export default function SaleConversations({ onClose, initialThreadId = null, user }) {
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(initialThreadId);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api("/api/sales/inquiries");
      setThreads(response.inquiries || []);
    } catch (cause) { setError(cause.message || "Could not load conversations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const selected = threads.find((item) => String(item._id) === String(selectedId));
  async function reply(event) {
    event.preventDefault();
    if (!draft.trim() || sending || !selected) return;
    setSending(true); setError("");
    try {
      await api("/api/sales/inquiries/" + encodeURIComponent(selected._id) + "/messages", {
        method: "POST", body: JSON.stringify({ message: draft.trim() }),
      });
      setDraft("");
      await load();
    } catch (cause) { setError(cause.message || "Could not send reply."); }
    finally { setSending(false); }
  }
  return <div className="marketplace-dialog" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="sale-inbox" role="dialog" aria-modal="true" aria-labelledby="sale-inbox-title">
      <header><h2 id="sale-inbox-title"><MessageCircle size={19}/> Marketplace messages</h2><button type="button" onClick={onClose} aria-label="Close messages"><X size={19}/></button></header>
      {error && <p className="marketplace-error" role="alert">{error}</p>}
      {loading && <p className="marketplace-loading" role="status">Loading conversations…</p>}
      <div className="sale-inbox-body">
        <aside className={selected ? "sale-inbox-list conversation-selected" : "sale-inbox-list"}>
          {!loading && threads.length === 0 && <p className="sale-inbox-empty">No messages yet. Open a listing and choose Message seller to start.</p>}
          {threads.map((thread) => {
            const other = String(thread.seller?._id) === String(user?._id || user?.id) ? thread.buyer : thread.seller;
            return <button key={thread._id} type="button" className={String(selectedId) === String(thread._id) ? "selected" : ""} onClick={() => setSelectedId(thread._id)}>
              <strong>{other?.fullName || "VerifiedNG member"}</strong>
              <small>{thread.listing?.title || "Listing unavailable"}</small>
              <span>{thread.messages?.at(-1)?.text || "Conversation started"}</span>
            </button>;
          })}
        </aside>
        {selected ? <div className="sale-inbox-thread">
          <button className="sale-inbox-back" type="button" onClick={() => setSelectedId(null)}><ArrowLeft size={15}/> All messages</button>
          <h3>{selected.listing?.title || "Listing unavailable"}</h3>
          <div className="sale-inbox-messages">{selected.messages?.map((message) =>
            <p key={message._id} className={String(message.sender) === String(user?._id || user?.id) ? "mine" : "theirs"}>{message.text}</p>
          )}</div>
          <form className="sale-inbox-compose" onSubmit={reply}>
            <label className="sr-only" htmlFor="sale-message-reply">Reply</label>
            <input id="sale-message-reply" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Write a reply…" />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send reply"><Send size={17}/></button>
          </form>
        </div> : threads.length > 0 && <div className="sale-inbox-placeholder"><MessageCircle size={23}/><p>Choose a conversation to view messages.</p><button type="button" onClick={load}><RefreshCw size={14}/> Refresh</button></div>}
      </div>
      <p className="sale-inbox-safety">Stay safe: never share passwords or verification codes, and inspect items before paying.</p>
    </section>
  </div>;
}
