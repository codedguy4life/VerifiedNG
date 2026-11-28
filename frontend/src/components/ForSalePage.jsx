import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, ImagePlus,
  MapPin, PackageOpen, Plus, Search, SlidersHorizontal, X, Tag, MessageCircle, Flag,
} from "lucide-react";
import { api } from "../lib/api.js";
import { uploadMedia } from "../lib/cloudinary.js";
import SaleConversations from "./SaleConversations.jsx";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const moneyLabel = (amount) => Number(amount) === 0 ? "Free" : money.format(amount);
const formatAge = (value) => {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed)) return "Recently posted";
  const minutes = Math.max(1, Math.floor(elapsed / 60000));
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  return days < 7 ? days + "d ago" : new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
};

export default function ForSalePage({ user, onEditProfile, onUnreadChange, onInboxClose, onInboxChange, onSelectedListingChange, initialListingId = null, initialShowInbox = false }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [categories, setCategories] = useState({});
  const [free, setFree] = useState(false);
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("km");
  const [sort, setSort] = useState("relevant");
  const [showFilters, setShowFilters] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [locationNotice, setLocationNotice] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(initialShowInbox);
  useEffect(() => { setInboxOpen(initialShowInbox); }, [initialShowInbox]);
  const [initialThreadId, setInitialThreadId] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!initialListingId) { setSelected(null); return; }
    if (String(selected?._id || "") === String(initialListingId)) return;
    let active = true;
    api("/api/sales/" + encodeURIComponent(initialListingId))
      .then((result) => { if (active) setSelected(result.item); })
      .catch((cause) => { if (active) setError(cause.message || "Selected listing is not available."); });
    return () => { active = false; };
  }, [initialListingId]);

  function selectListing(item) {
    setSelected(item);
    onSelectedListingChange?.(item?._id || null);
  }

  useEffect(() => {
    let active = true;
    api("/api/sales/categories")
      .then((response) => { if (active) setCategories(response.categories || {}); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      if ((sort === "nearest" || distance) && !buyerLocation) {
        setLoading(false);
        setError("");
        setItems([]);
        setLocationNotice("Allow your location to show nearby listings. Nothing is saved to your profile.");
        return;
      }
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), limit: "20", sort });
      if (query.trim()) params.set("search", query.trim());
      if (category) params.set("category", category);
      if (subcategory) params.set("subcategory", subcategory);
      if (free) params.set("free", "true");
      if (buyerLocation) {
        params.set("lat", String(buyerLocation.lat));
        params.set("lng", String(buyerLocation.lng));
      }
      if (distance) params.set("distanceKm", String(Number(distance) * (unit === "mi" ? 1.609344 : 1)));
      api("/api/sales?" + params, { signal: controller.signal })
        .then((response) => {
          if (controller.signal.aborted) return;
          setItems((current) => page === 1 ? response.items || [] : [...current, ...(response.items || [])]);
          setTotal(response.total || 0);
          setHasMore(Boolean(response.hasMore));
        })
        .catch((cause) => { if (!controller.signal.aborted) { setItems([]); setError(cause.message || "Could not load listings."); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, query.trim() ? 300 : 0);
    return () => { clearTimeout(handle); controller.abort(); };
  }, [query, category, subcategory, free, distance, unit, sort, buyerLocation, page, reload]);

  function resetPage(callback) {
    setPage(1);
    callback();
  }

  function allowLocation() {
    if (!navigator.geolocation) {
      setLocationNotice("Your browser does not support location. You can still browse all listings.");
      return;
    }
    setLocationNotice("Requesting location permission…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBuyerLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationNotice("Showing approximate distances. Your location is only used for this search.");
        setPage(1);
      },
      () => {
        setLocationNotice("Location was not available. Showing all listings instead.");
        setDistance("");
        setSort((current) => current === "nearest" ? "relevant" : current);
        setPage(1);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  function distanceText(value) {
    if (value === null || value === undefined) return "";
    const rounded = unit === "mi" ? value / 1.609344 : value;
    return "~" + Math.max(0.1, Math.round(rounded * 10) / 10) + " " + unit;
  }

  async function contactSeller(event) {
    event.preventDefault();
    if (!selected || actionBusy || contactDraft.trim().length < 10) return;
    setActionBusy(true); setError(""); setNotice("");
    try {
      const result = await api("/api/sales/" + encodeURIComponent(selected._id) + "/inquiries", {
        method: "POST", body: JSON.stringify({ message: contactDraft.trim() }),
      });
      setContactDraft(""); setContactOpen(false); selectListing(null);
      setInitialThreadId(result.threadId); setInboxOpen(true); onInboxChange?.(true);
      setNotice("Message sent to seller. You can continue the conversation in Messages.");
    } catch (cause) { setError(cause.message || "Could not message seller."); }
    finally { setActionBusy(false); }
  }
  async function reportListing(event) {
    event.preventDefault();
    if (!selected || actionBusy) return;
    setActionBusy(true); setError("");
    try {
      const result = await api("/api/sales/" + encodeURIComponent(selected._id) + "/reports", {
        method: "POST", body: JSON.stringify({ reason: reportReason, details: reportDetails.trim() }),
      });
      setNotice(result.message || "Report submitted.");
      selectListing(null); setReportOpen(false); setReportDetails("");
    } catch (cause) { setError(cause.message || "Could not report listing."); }
    finally { setActionBusy(false); }
  }
  async function markSold(item) {
    if (!window.confirm("Mark this item as sold? It will be hidden from active listings.")) return;
    setActionBusy(true);
    setError("");
    try {
      await api("/api/sales/" + encodeURIComponent(item._id) + "/status", {
        method: "PATCH", body: JSON.stringify({ status: "sold" }),
      });
      selectListing(null);
      setPage(1);
      setReload((n) => n + 1);
    } catch (cause) {
      setError(cause.message || "Could not update listing.");
    } finally {
      setActionBusy(false);
    }
  }

  const activeFilters = [category, free ? "Free" : "", distance ? distance + " " + unit : ""].filter(Boolean).length;

  return (
    <div className="marketplace">
      <div className="marketplace-topbar">
        <label className="marketplace-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search all listings</span>
          <input type="search" maxLength={80} value={query} onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="Search all listings" />
        </label>
        <button className="marketplace-messages" type="button" aria-label="Marketplace messages" onClick={() => { setInitialThreadId(null); setInboxOpen(true); onInboxChange?.(true); }}><MessageCircle size={17} /> <span>Messages</span></button>
        <button className="marketplace-sell" type="button" onClick={() => setShowCreate(true)}><Plus size={17} /> <span>Sell</span></button>
      </div>

      <div className="marketplace-filterbar" aria-label="Marketplace filters">
        <button type="button" className={"marketplace-pill " + (showFilters ? "active" : "")} aria-expanded={showFilters} onClick={() => setShowFilters((value) => !value)}>
          <SlidersHorizontal size={15} /> Filters {activeFilters ? "(" + activeFilters + ")" : ""} <ChevronDown size={13} />
        </button>
        <button type="button" className={"marketplace-pill " + (category ? "active" : "")} onClick={() => setShowFilters(true)}>
          {category || "All categories"} <ChevronDown size={13} />
        </button>
        <button type="button" aria-pressed={free} className={"marketplace-pill " + (free ? "active" : "")} onClick={() => resetPage(() => setFree((value) => !value))}>
          {free && <Check size={13} />} Free
        </button>
        <button type="button" className={"marketplace-pill " + (distance ? "active" : "")} onClick={() => setShowFilters(true)}><MapPin size={14} /> {distance ? distance + " " + unit : "Distance"}</button>
        <label className="marketplace-sort">
          <span className="sr-only">Sort listings</span>
          <select value={sort} onChange={(event) => { resetPage(() => setSort(event.target.value)); if (event.target.value === "nearest" && !buyerLocation) allowLocation(); }}>
            <option value="relevant">Most relevant</option>
            <option value="newest">Newest first</option>
            <option value="price_low">Lowest price</option>
            <option value="price_high">Highest price</option>
            <option value="nearest">Nearest first</option>
          </select>
        </label>
      </div>

      {showFilters && (
        <div className="marketplace-filterpanel">
          <label>Category
            <select value={category} onChange={(event) => resetPage(() => { setCategory(event.target.value); setSubcategory(""); })}>
              <option value="">All categories</option>
              {Object.keys(categories).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          {category && <label>Type
            <select value={subcategory} onChange={(event) => resetPage(() => setSubcategory(event.target.value))}>
              <option value="">All {category}</option>
              {(categories[category] || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>}
          <label>Within
            <select value={distance} onChange={(event) => { resetPage(() => setDistance(event.target.value)); if (event.target.value && !buyerLocation) allowLocation(); }}>
              <option value="">Any distance</option>
              {[5, 10, 25, 50, 100].map((number) => <option key={number} value={number}>{number} {unit}</option>)}
            </select>
          </label>
          <label>Unit
            <select value={unit} onChange={(event) => resetPage(() => setUnit(event.target.value))}>
              <option value="km">Kilometres</option>
              <option value="mi">Miles</option>
            </select>
          </label>
          <div className="marketplace-filteractions">
            <button type="button" onClick={allowLocation}><MapPin size={14} /> {buyerLocation ? "Update location" : "Allow distance"}</button>
            <button type="button" onClick={() => { setCategory(""); setSubcategory(""); setFree(false); setDistance(""); setSort("relevant"); setPage(1); }}>Clear filters</button>
          </div>
        </div>
      )}
      {notice && <p className="marketplace-location-note" role="status">{notice}</p>}
      {locationNotice && <p className="marketplace-location-note" role="status">{locationNotice}</p>}

      <div className="marketplace-heading"><strong>Listings</strong><span>{loading && page === 1 ? "Loading…" : total + " available"}</span></div>
      {error && <p className="marketplace-error" role="alert">{error}</p>}
      {items.length > 0 && (
        <div className="marketplace-grid">
          {items.map((item) => (
            <div key={item._id} className="marketplace-card-wrap">
              <button type="button" className="marketplace-card" onClick={() => { selectListing(item); setContactOpen(false); setReportOpen(false); setError(""); }}>
              <span className="marketplace-card-media">
                {item.imageUrl ? <img src={item.imageUrl} loading="lazy" alt={item.title} /> : <PackageOpen size={31} />}
                {Number(item.price) === 0 && <span className="marketplace-free-tag">FREE</span>}
              </span>
              <span className="marketplace-card-body">
                <strong className="marketplace-price">{moneyLabel(item.price)}</strong>
                <span className="marketplace-title">{item.title}</span>
                {item.description && <span className="marketplace-description">{item.description}</span>}
                <span className="marketplace-meta"><Clock3 size={12} /> {formatAge(item.createdAt)}</span>
                <span className="marketplace-meta"><MapPin size={12} /> {[item.city, item.state].filter(Boolean).join(", ") || "Nigeria"}{item.distanceKm !== null && item.distanceKm !== undefined ? " · " + distanceText(item.distanceKm) : ""}</span>
              </span>
              </button>
              {String(item.seller?._id || item.seller) === String(user?._id || user?.id) && (
                <button type="button" className="marketplace-card-mark-sold" disabled={actionBusy} onClick={() => markSold(item)}><Check size={13} /> Mark sold</button>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="marketplace-empty"><PackageOpen size={28} /><strong>No listings found</strong>
          <p>Try a different search or clear your filters. Only real items posted by members will appear here.</p>
          <button type="button" onClick={() => { setQuery(""); setCategory(""); setSubcategory(""); setDistance(""); setFree(false); setSort("relevant"); setPage(1); }}>Clear filters</button>
        </div>
      )}
      {loading && <p className="marketplace-loading" role="status">Loading listings…</p>}
      {hasMore && !loading && <button type="button" className="marketplace-loadmore" onClick={() => setPage((value) => value + 1)}>Load more <ArrowRight size={15} /></button>}

      {selected && createPortal(
        <div className="marketplace-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) selectListing(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="marketplace-detail-title" className="marketplace-detail">
            <button type="button" className="marketplace-close" aria-label="Close details" onClick={() => selectListing(null)}><X size={19} /></button>
            <div className="marketplace-detail-photo">{selected.imageUrl ? <img src={selected.imageUrl} alt={selected.title} /> : <PackageOpen size={40} />}</div>
            <div className="marketplace-detail-body">
              <strong className="marketplace-price">{moneyLabel(selected.price)}</strong>
              <h2 id="marketplace-detail-title">{selected.title}</h2>
              <p>{selected.description || "No extra description provided."}</p>
              <span className="marketplace-meta"><MapPin size={14} /> {[selected.city, selected.state].filter(Boolean).join(", ") || "Nigeria"}</span>
              <span className="marketplace-meta"><Clock3 size={14} /> {formatAge(selected.createdAt)} · {selected.seller?.fullName || "Member"}</span>
              {String(selected.seller?._id) === String(user?._id || user?.id) ? (
                <button className="marketplace-sold-button" disabled={actionBusy} type="button" onClick={() => markSold(selected)}>Mark as sold</button>
              ) : <>
                <button className="marketplace-sold-button" type="button" onClick={() => { setContactOpen((open) => !open); setReportOpen(false); }}><MessageCircle size={15} /> Message seller</button>
                {contactOpen && <form className="marketplace-contact-form" onSubmit={contactSeller}>
                  <label>Your message to the seller<textarea required minLength={10} maxLength={1000} rows={3} value={contactDraft} onChange={(event) => setContactDraft(event.target.value)} placeholder="Hello, is this item still available?" /></label>
                  <button type="submit" disabled={actionBusy || contactDraft.trim().length < 10}>{actionBusy ? "Sending…" : "Send message"}</button>
                </form>}
                <button className="marketplace-report-toggle" type="button" onClick={() => { setReportOpen((open) => !open); setContactOpen(false); }}><Flag size={14}/> Report listing</button>
                {reportOpen && <form className="marketplace-contact-form" onSubmit={reportListing}>
                  <label>Reason<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                    <option value="scam">Possible scam</option><option value="prohibited">Prohibited item</option><option value="misleading">Misleading information</option><option value="spam">Spam</option><option value="other">Other</option>
                  </select></label>
                  <label>Details (optional)<textarea rows={2} maxLength={500} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} /></label>
                  <button type="submit" disabled={actionBusy}>Submit report</button>
                </form>}
                <p className="marketplace-detail-note">Use in-app messages. Never share passwords or pay before inspecting an item.</p>
              </>}
              {error && <p className="marketplace-error" role="alert">{error}</p>}
            </div>
          </section>
        </div>,
        document.body,
      )}
      {inboxOpen && <SaleConversations user={user} initialThreadId={initialThreadId} onUnreadChange={onUnreadChange} onClose={() => { setInboxOpen(false); onInboxChange?.(false); onInboxClose?.(); onUnreadChange?.(); }} />}
      {showCreate && createPortal(
        <CreateSaleItem
          categories={categories}
          user={user}
          onEditProfile={onEditProfile}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setPage(1); setReload((n) => n + 1); }}
        />,
        document.body,
      )}
    </div>
  );
}

function CreateSaleItem({ categories, user, onEditProfile, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [photo, setPhoto] = useState(null);
  const [approximateLocation, setApproximateLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function useApproximateLocation() {
    if (!navigator.geolocation) { setLocationStatus("Location unavailable in this browser."); return; }
    setLocationStatus("Requesting your permission…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setApproximateLocation({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 });
        setLocationStatus("Approximate location added (rounded to about 1 km). You can remove it.");
      },
      () => setLocationStatus("Location not shared. You can publish without it."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function uploadPhoto() {
    if (!photo) return "";
    return uploadMedia(photo, "image");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    // Do not upload a photo before checking all required listing details.
    if (title.trim().length < 3) {
      setError("Enter an item name with at least 3 characters.");
      return;
    }
    if (!category) {
      setError("Choose a category for your item.");
      return;
    }
    if (price === "" || !Number.isInteger(Number(price)) || Number(price) < 0) {
      setError("Enter the price in naira (use 0 for a free item).");
      return;
    }
    if (!user?.city?.trim() && !user?.state?.trim()) {
      setError("Add your city or state in My profile before publishing. Tap Set location below.");
      return;
    }
    setBusy(true);
    try {
      const imageUrl = await uploadPhoto();
      await api("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(), description: description.trim(),
          price: Number(price), category, subcategory, imageUrl,
          ...(approximateLocation || {}),
        }),
      });
      onCreated();
    } catch (cause) {
      setError(cause.message || "Could not publish listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="marketplace-dialog">
      <section role="dialog" aria-modal="true" aria-labelledby="marketplace-create-title" className="marketplace-create">
        <header className="marketplace-create-header"><h2 id="marketplace-create-title">Sell an item</h2><button type="button" className="marketplace-close" onClick={onClose} disabled={busy} aria-label="Close"><X size={19} /></button></header>
        <form id="marketplace-create-form" onSubmit={submit} className="marketplace-create-form">
          <label>Item name <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Samsung 32-inch TV" minLength={3} maxLength={100} required /></label>
          <div className="marketplace-form-row">
            <label>Category <select value={category} required onChange={(event) => { setCategory(event.target.value); setSubcategory(""); }}><option value="">Choose</option>{Object.keys(categories).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label>Type <select value={subcategory} disabled={!category} onChange={(event) => setSubcategory(event.target.value)}><option value="">All types</option>{(categories[category] || []).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
          </div>
          <label>Price in naira (0 if free) <input type="number" min="0" max="1000000000" step="1" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="15000" /></label>
          <label>Short description <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Condition, size, anything the buyer should know…" maxLength={1000} rows={3} /></label>
          <label className="marketplace-file"><ImagePlus size={18} /> {photo ? photo.name : "Add product photo (optional)"} <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size > 8 * 1024 * 1024) { setError("Photo must be 8 MB or less."); event.target.value = ""; setPhoto(null); } else { setError(""); setPhoto(file || null); } }} /></label>
          <div className="marketplace-seller-location"><MapPin size={15} /><span>Listed in <strong>{[user?.city, user?.state].filter(Boolean).join(", ") || "Location not set"}</strong></span>
            {(!user?.city && !user?.state) && <button type="button" onClick={onEditProfile}>Set location</button>}
          </div>
          <div className="marketplace-approx"><button type="button" onClick={approximateLocation ? () => { setApproximateLocation(null); setLocationStatus("Approximate location removed."); } : useApproximateLocation}><MapPin size={14} /> {approximateLocation ? "Remove approximate distance" : "Add approximate distance (optional)"}</button><small>Only rounded coordinates are stored, not your precise location. Leave off for privacy.</small>{locationStatus && <small role="status">{locationStatus}</small>}</div>
        </form>
        <footer className="marketplace-create-footer">
          {(!user?.city?.trim() && !user?.state?.trim()) && (
            <div className="marketplace-publish-location">
              <span>Set your city or state to publish a listing.</span>
              <button type="button" onClick={onEditProfile}>Set location</button>
            </div>
          )}
          {error && <p className="marketplace-error" role="alert">{error}</p>}
          <button className="marketplace-publish" type="submit" form="marketplace-create-form" disabled={busy}><Tag size={15} /> {busy ? "Publishing…" : "Publish listing"}</button>
        </footer>
      </section>
    </div>
  );
}
