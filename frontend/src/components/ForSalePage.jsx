import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, ImagePlus,
  MapPin, PackageOpen, Plus, Search, SlidersHorizontal, X, Tag,
} from "lucide-react";
import { api } from "../lib/api.js";

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

export default function ForSalePage({ user, onEditProfile }) {
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
      () => setLocationNotice("Location was not available. You can still browse without distance filters."),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  function distanceText(value) {
    if (value === null || value === undefined) return "";
    const rounded = unit === "mi" ? value / 1.609344 : value;
    return "~" + Math.max(0.1, Math.round(rounded * 10) / 10) + " " + unit;
  }

  async function markSold(item) {
    if (!window.confirm("Mark this item as sold? It will be hidden from active listings.")) return;
    setActionBusy(true);
    setError("");
    try {
      await api("/api/sales/" + encodeURIComponent(item._id) + "/status", {
        method: "PATCH", body: JSON.stringify({ status: "sold" }),
      });
      setSelected(null);
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
      {locationNotice && <p className="marketplace-location-note" role="status">{locationNotice}</p>}

      <div className="marketplace-heading"><strong>Listings</strong><span>{loading && page === 1 ? "Loading…" : total + " available"}</span></div>
      {error && <p className="marketplace-error" role="alert">{error}</p>}
      {items.length > 0 && (
        <div className="marketplace-grid">
          {items.map((item) => (
            <button key={item._id} type="button" className="marketplace-card" onClick={() => setSelected(item)}>
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

      {selected && (
        <div className="marketplace-dialog" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="marketplace-detail-title" className="marketplace-detail">
            <button type="button" className="marketplace-close" aria-label="Close details" onClick={() => setSelected(null)}><X size={19} /></button>
            <div className="marketplace-detail-photo">{selected.imageUrl ? <img src={selected.imageUrl} alt={selected.title} /> : <PackageOpen size={40} />}</div>
            <div className="marketplace-detail-body">
              <strong className="marketplace-price">{moneyLabel(selected.price)}</strong>
              <h2 id="marketplace-detail-title">{selected.title}</h2>
              <p>{selected.description || "No extra description provided."}</p>
              <span className="marketplace-meta"><MapPin size={14} /> {[selected.city, selected.state].filter(Boolean).join(", ") || "Nigeria"}</span>
              <span className="marketplace-meta"><Clock3 size={14} /> {formatAge(selected.createdAt)} · {selected.seller?.fullName || "Member"}</span>
              {String(selected.seller?._id) === String(user?._id) ? (
                <button className="marketplace-sold-button" disabled={actionBusy} type="button" onClick={() => markSold(selected)}>Mark as sold</button>
              ) : <p className="marketplace-detail-note">In-app buyer/seller messaging is not connected yet. Never pay a stranger in advance without verifying the item.</p>}
            </div>
          </section>
        </div>
      )}
      {showCreate && (
        <CreateSaleItem
          categories={categories}
          user={user}
          onEditProfile={onEditProfile}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setPage(1); setReload((n) => n + 1); }}
        />
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
    const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset || cloud.startsWith("your_") || preset.startsWith("your_")) {
      throw new Error("Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env.local to upload a photo.");
    }
    const data = new FormData();
    data.append("file", photo);
    data.append("upload_preset", preset);
    const response = await fetch("https://api.cloudinary.com/v1_1/" + cloud + "/image/upload", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Photo upload failed.");
    return result.secure_url;
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
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
        <form onSubmit={submit} className="marketplace-create-form">
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
          {error && <p className="marketplace-error" role="alert">{error}</p>}
          <button className="marketplace-publish" type="submit" disabled={busy || !title.trim() || !category || price === "" || (!user?.city && !user?.state)}><Tag size={15} /> {busy ? "Publishing…" : "Publish listing"}</button>
        </form>
      </section>
    </div>
  );
}
