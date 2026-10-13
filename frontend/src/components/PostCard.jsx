import { useState } from "react";
import {
  MessageCircle,
  Heart,
  MapPin,
  Globe2,
  MoreHorizontal,
  Send,
  Flag,
  Pencil,
  Trash2,
  ShieldCheck,
} from "lucide-react";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(date);
};

const initials = (name = "U") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const reportReasons = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "scam", label: "Scam or fraud" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
];

export default function PostCard({
  post,
  currentUser,
  onReach,
  onComment,
  onEdit,
  onDelete,
  onReport,
}) {
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [sendingReport, setSendingReport] = useState(false);
  const [localError, setLocalError] = useState("");

  const author = post.author || {};
  const authorId = author._id || author.id;
  const currentUserId = currentUser?.id || currentUser?._id;

  const isOwner =
    Boolean(authorId) &&
    Boolean(currentUserId) &&
    String(authorId) === String(currentUserId);

  const comments = Array.isArray(post.comments) ? post.comments : [];
  const reactionCount = post.reactionCount ?? post.reactions?.length ?? 0;
  const commentCount = post.commentCount ?? comments.length;

  async function submitComment(event) {
    event.preventDefault();

    const text = commentText.trim();
    if (!text || sendingComment) return;

    setSendingComment(true);
    setLocalError("");

    try {
      const success = await onComment(post._id, text);

      if (success) {
        setCommentText("");
        setShowComments(true);
      }
    } catch (error) {
      setLocalError(error.message || "Could not add your comment.");
    } finally {
      setSendingComment(false);
    }
  }

  async function submitReport(event) {
    event.preventDefault();

    if (sendingReport) return;

    setSendingReport(true);
    setLocalError("");

    try {
      const success = await onReport(post._id, {
        reason: reportReason,
        details: reportDetails.trim(),
      });

      if (success) {
        setShowReport(false);
        setShowMenu(false);
        setReportDetails("");
      }
    } catch (error) {
      setLocalError(error.message || "Could not submit your report.");
    } finally {
      setSendingReport(false);
    }
  }

  return (
    <article className="post-card card">
      <header className="post-header">
        <div className="post-avatar">
          {author.profilePhoto ? (
            <img src={author.profilePhoto} alt="" className="avatar-image" />
          ) : (
            initials(author.fullName)
          )}
        </div>

        <div className="post-author-info">
          <div className="post-author-name">
            <strong>{author.fullName || "VerifiedNG member"}</strong>
            {author.isVerified && (
              <ShieldCheck
                size={15}
                aria-label="Verified member"
                title="Verified member"
              />
            )}
          </div>

          <div className="post-meta">
            <span>{formatRelativeTime(post.createdAt)}</span>
            {author.role && (
              <>
                <span aria-hidden="true">·</span>
                <span>{author.role}</span>
              </>
            )}
          </div>
        </div>

        <div className="post-menu-wrap">
          <button
            type="button"
            className="icon-button"
            aria-label="Post options"
            aria-expanded={showMenu}
            onClick={() => setShowMenu((value) => !value)}
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="post-menu">
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(post);
                    }}
                  >
                    <Pencil size={15} /> Edit post
                  </button>

                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(post._id);
                    }}
                  >
                    <Trash2 size={15} /> Delete post
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowReport(true);
                  }}
                >
                  <Flag size={15} /> Report post
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="post-labels">
        {post.category && (
          <span className="post-category">{post.category}</span>
        )}

        <span className="post-audience">
          {post.audience === "local" ? (
            <MapPin size={13} />
          ) : (
            <Globe2 size={13} />
          )}
          {post.audience === "local" ? "Local" : "Across Nigeria"}
        </span>
      </div>

      <p className="post-text">{post.text}</p>

      {(post.videoUrl || post.imageUrl || post.mediaUrl || post.media?.url) && (
        <div className="post-media">
          {(post.videoUrl || post.media?.type === "video") ? (
            <video controls preload="metadata" src={post.videoUrl || post.media?.url || post.mediaUrl} />
          ) : (
            <img src={post.imageUrl || post.media?.url || post.mediaUrl} alt="Post attachment" loading="lazy" />
          )}
        </div>
      )}

      {(post.location?.city || post.location?.state) && (
        <p className="post-location">
          <MapPin size={13} />
          {[post.location.city, post.location.state].filter(Boolean).join(", ")}
        </p>
      )}

      <div className="post-stats">
        <span>
          <Heart size={14} /> {reactionCount} reaches
        </span>
        <button
          type="button"
          className="text-button"
          onClick={() => setShowComments((value) => !value)}
        >
          {commentCount} comments
        </button>
      </div>

      <div className="post-actions">
        <button
          type="button"
          className={`post-action ${post.reactedByMe ? "is-active" : ""}`}
          onClick={() => onReach(post._id)}
        >
          <Heart size={17} fill={post.reactedByMe ? "currentColor" : "none"} />
          Reach
        </button>

        <button
          type="button"
          className="post-action"
          onClick={() => setShowComments((value) => !value)}
        >
          <MessageCircle size={17} />
          Comment
        </button>
      </div>

      {localError && (
        <p className="form-error" role="alert">
          {localError}
        </p>
      )}

      {showComments && (
        <section className="post-comments">
          {comments.map((comment, index) => (
            <div
              className="post-comment"
              key={comment._id || `${comment.createdAt}-${index}`}
            >
              <strong>{comment.author?.fullName || "VerifiedNG member"}</strong>
              <p>{comment.text}</p>
              <span className="comment-date">
                {formatDate(comment.createdAt)}
              </span>
            </div>
          ))}

          {!comments.length && (
            <p className="muted small">
              No comments yet. Start the conversation.
            </p>
          )}

          <form className="comment-form" onSubmit={submitComment}>
            <input
              type="text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Write a comment..."
              maxLength={1000}
              aria-label="Write a comment"
            />
            <button
              type="submit"
              aria-label="Send comment"
              disabled={!commentText.trim() || sendingComment}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      {showReport && (
        <form className="report-form" onSubmit={submitReport}>
          <h4>Report this post</h4>
          <label>
            Reason
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              {reportReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Additional details (optional)
            <textarea
              value={reportDetails}
              onChange={(event) => setReportDetails(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell us a little more..."
            />
          </label>

          <div className="report-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => setShowReport(false)}
              disabled={sendingReport}
            >
              Cancel
            </button>
            <button type="submit" disabled={sendingReport}>
              {sendingReport ? "Sending..." : "Submit report"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
