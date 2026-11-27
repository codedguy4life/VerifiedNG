import BrandLogo from "./BrandLogo.jsx";
import {
  ArrowRight, ArrowUpRight, Armchair, Compass, Heart, LampDesk, MapPin,
  MessageCircle, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Users, Wrench,
} from "lucide-react";
import "./public-showcase.css";

// These are labelled interface examples, not real member posts or marketplace items.
function PreviewFrame({ label, children, className = "" }) {
  return (
    <div className={"public-showcase-frame " + className} aria-label={label}>
      <div className="public-showcase-frame-head">
        <BrandLogo className="public-showcase-mini-logo" />
        <span className="public-showcase-demo-label">Example screen</span>
      </div>
      {children}
    </div>
  );
}
function FeedPreview() {
  return (
    <PreviewFrame label="Example of the VerifiedNG Home feed" className="public-showcase-frame-feed">
      <div className="public-showcase-frame-tabs">
        <span className="selected"><Compass size={15}/> All posts</span>
        <span><MapPin size={15}/> By area</span>
      </div>
      <article className="public-showcase-post">
        <header>
          <span className="public-showcase-avatar">V</span>
          <div><strong>Community update</strong><small>Across Nigeria · Example post</small></div>
          <span className="public-showcase-post-dots">•••</span>
        </header>
        <p>Need a recommendation in your area? Ask the community.</p>
        <div className="public-showcase-post-photo">
          <div className="public-showcase-post-photo-top">Local tips &amp; updates</div>
          <div className="public-showcase-post-photo-copy">Good things start with a conversation.</div>
        </div>
        <footer><span><Heart size={15}/> Like</span><span><MessageCircle size={15}/> Comment</span><span><ArrowUpRight size={15}/> Share</span></footer>
      </article>
    </PreviewFrame>
  );
}
function ServicesPreview() {
  return (
    <PreviewFrame label="Example of service search on VerifiedNG" className="public-showcase-frame-services">
      <div className="public-showcase-search-field"><Search size={17}/><span>Search for a service</span><SlidersHorizontal size={16}/></div>
      <div className="public-showcase-results-head"><strong>Explore services</strong><small>Example categories</small></div>
      <div className="public-showcase-service-list">
        <div className="public-showcase-service-item">
          <div className="public-showcase-service-icon"><Wrench size={24}/></div>
          <div><strong>Electrical repairs</strong><span>Find electricians near you</span><small>View profiles before contacting</small></div>
          <ArrowUpRight size={17}/>
        </div>
        <div className="public-showcase-service-item">
          <div className="public-showcase-service-icon second"><Users size={24}/></div>
          <div><strong>Home services</strong><span>Explore local service providers</span><small>Message to ask questions</small></div>
          <ArrowUpRight size={17}/>
        </div>
      </div>
      <div className="public-showcase-frame-note"><ShieldCheck size={15}/> Check each provider's details before hiring.</div>
    </PreviewFrame>
  );
}
function SalePreview() {
  return (
    <PreviewFrame label="Example of the VerifiedNG For Sale area" className="public-showcase-frame-sale">
      <div className="public-showcase-sale-header"><strong>For Sale</strong><span>Explore listings</span></div>
      <div className="public-showcase-search-field"><Search size={17}/><span>Search items for sale</span><SlidersHorizontal size={16}/></div>
      <div className="public-showcase-sale-grid">
        <div className="public-showcase-sale-item">
          <div className="public-showcase-sale-photo"><Armchair size={44}/></div>
          <div><strong>Furniture</strong><small>Example item</small></div>
        </div>
        <div className="public-showcase-sale-item">
          <div className="public-showcase-sale-photo alt"><LampDesk size={44}/></div>
          <div><strong>Home items</strong><small>Example item</small></div>
        </div>
      </div>
      <div className="public-showcase-sale-bottom"><MessageCircle size={16}/> Chat directly with sellers on VerifiedNG</div>
    </PreviewFrame>
  );
}
const sections = [
  {
    id: "feed",
    eyebrow: "COMMUNITY POSTS",
    title: "See what's happening.",
    description: "See what people are talking about across Nigeria. Want posts closer to home? Choose your area.",
    action: "Join the conversation",
    Visual: FeedPreview,
  },
  {
    id: "services",
    eyebrow: "FIND SERVICES",
    title: "Need help? Find someone nearby.",
    description: "Looking for an electrician, tutor or another service? Search by skill or area, check profiles and ask questions.",
    action: "Explore services",
    Visual: ServicesPreview,
  },
  {
    id: "sale",
    eyebrow: "BUY & SELL",
    title: "Buy, sell and chat.",
    description: "See things for sale, post what you want to sell and chat with buyers or sellers.",
    action: "Explore For Sale",
    Visual: SalePreview,
  },
];
export default function PublicShowcase({ loggedIn = false }) {
  const href = loggedIn ? "/app" : "/signup";
  return (
    <section className="public-showcase" id="features">
      <div className="public-container">
        <div className="public-showcase-heading">
          <span className="public-eyebrow">WHAT YOU CAN DO</span>
          <h2>More ways to connect.</h2>
          <p>See what's happening, find useful services and connect with people.</p>
        </div>
        <div className="public-showcase-stack">
          {sections.map(({ id, eyebrow, title, description, action, Visual }, index) => (
            <div className={"public-showcase-row" + (index % 2 ? " public-showcase-reverse" : "")} key={id}>
              <div className="public-showcase-copy">
                <span className="public-eyebrow">{eyebrow}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <a href={href} className="public-showcase-link">{action}<ArrowRight size={17}/></a>
              </div>
              <div className="public-showcase-visual"><Visual /></div>
            </div>
          ))}
        </div>
        <div className="public-showcase-groups">
          <div className="public-showcase-groups-icon"><Users size={24}/></div>
          <div><strong>Meet people in Groups.</strong><p>Find groups for your interests or area. You'll need a verified account to join.</p></div>
          <a href={href}>Explore Groups <ArrowRight size={16}/></a>
        </div>
      </div>
    </section>
  );
}
