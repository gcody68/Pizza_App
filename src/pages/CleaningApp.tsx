import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck, Star, Hop as Home, Compass, MessageSquare, User, ChevronRight, MapPin, Clock, CircleCheck as CheckCircle, ArrowLeft, Send, Phone, Shield, Sparkles, X, Plus, Minus, Calendar, Bell } from "lucide-react";

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  primary: "#4740D4",        // royal indigo
  primaryDark: "#3730A3",
  primaryLight: "#EEF2FF",
  primaryMid: "#6366F1",
  accent: "#F59E0B",
  white: "#ffffff",
  bg: "#F8F9FD",
  card: "#ffffff",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  success: "#10B981",
};

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "deep",     label: "Deep Cleaning",         icon: "🧹", color: "#EEF2FF", iconBg: "#4740D4" },
  { id: "kitchen",  label: "Kitchen Cleaning",       icon: "🍽️", color: "#FFF7ED", iconBg: "#F97316" },
  { id: "bathroom", label: "Bathroom Disinfection",  icon: "🚿", color: "#F0FDF4", iconBg: "#22C55E" },
  { id: "window",   label: "Window Washing",         icon: "🪟", color: "#EFF6FF", iconBg: "#3B82F6" },
  { id: "carpet",   label: "Carpet Cleaning",        icon: "🏠", color: "#FDF4FF", iconBg: "#A855F7" },
  { id: "laundry",  label: "Laundry & Ironing",      icon: "👕", color: "#FFF1F2", iconBg: "#F43F5E" },
  { id: "outdoor",  label: "Outdoor Cleaning",       icon: "🌿", color: "#F0FDF4", iconBg: "#16A34A" },
  { id: "office",   label: "Office Cleaning",        icon: "💼", color: "#F8FAFC", iconBg: "#64748B" },
];

interface Service {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: number;
  duration: string;
  image: string;
  provider: string;
  providerImg: string;
  description: string;
  includes: string[];
  location: string;
  popular?: boolean;
}

const SERVICES: Service[] = [
  {
    id: "s1", name: "Premium Deep Clean", category: "deep", rating: 4.9, reviews: 284,
    price: 120, duration: "3-4 hrs",
    image: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "CleanPro Team", providerImg: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "Our most thorough clean — every surface, corner, and hidden area professionally sanitized with eco-friendly products.",
    includes: ["All rooms vacuumed & mopped", "Surfaces disinfected", "Inside fridge & oven", "Baseboards & light switches", "Bathroom deep scrub"],
    location: "Available citywide", popular: true,
  },
  {
    id: "s2", name: "Kitchen Deep Clean", category: "kitchen", rating: 4.8, reviews: 192,
    price: 75, duration: "1-2 hrs",
    image: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "ShineBright Co.", providerImg: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "Specialist kitchen cleaning — grease, grime, and bacteria eliminated from every appliance and surface.",
    includes: ["Stovetop & oven degreasing", "Cabinet exterior wipe-down", "Sink & faucet polish", "Countertop disinfection", "Microwave interior"],
    location: "Available citywide",
  },
  {
    id: "s3", name: "Bathroom Disinfection", category: "bathroom", rating: 4.9, reviews: 156,
    price: 55, duration: "45-60 min",
    image: "https://images.pexels.com/photos/7641854/pexels-photo-7641854.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "HygieneFirst", providerImg: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "Hospital-grade disinfection for your bathroom — mold-free, germ-free, and sparkling clean.",
    includes: ["Toilet disinfection", "Grout scrubbing", "Mirror & glass polish", "Floor deep clean", "Drain unclogging"],
    location: "Available citywide", popular: true,
  },
  {
    id: "s4", name: "Window & Glass Wash", category: "window", rating: 4.7, reviews: 118,
    price: 60, duration: "1-2 hrs",
    image: "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "ClearView Pro", providerImg: "https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "Streak-free windows inside and out. We handle the ladders and equipment.",
    includes: ["Interior window cleaning", "Exterior window cleaning", "Frame & sill wipe-down", "Screen cleaning", "Streak-free guarantee"],
    location: "Available citywide",
  },
  {
    id: "s5", name: "Full Home Standard Clean", category: "deep", rating: 4.8, reviews: 341,
    price: 89, duration: "2-3 hrs",
    image: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "CleanPro Team", providerImg: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "A thorough standard clean for your whole home. Perfect for weekly or bi-weekly maintenance.",
    includes: ["Dusting all surfaces", "Vacuuming & mopping", "Bathroom & kitchen clean", "Trash removal", "Bed making"],
    location: "Available citywide",
  },
  {
    id: "s6", name: "Carpet Steam Cleaning", category: "carpet", rating: 4.6, reviews: 87,
    price: 95, duration: "2-3 hrs",
    image: "https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg?auto=compress&cs=tinysrgb&w=600",
    provider: "SteamMaster", providerImg: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80",
    description: "Professional hot-water extraction removes stains, allergens, and deep-set dirt from your carpets.",
    includes: ["Pre-treatment spray", "Hot-water extraction", "Stain removal", "Deodorizer applied", "Fast drying formula"],
    location: "Available citywide",
  },
];

const PROMOS = [
  { id: 1, tag: "Limited Time!", title: "Get Special Offer", highlight: "Up to 40% Off", sub: "All Services Available · T&C Applied", bg: "#232066", accent: "#7C7FE8", cta: "Claim", img: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: 2, tag: "New Users!", title: "First Booking Deal", highlight: "Flat $20 Off",  sub: "Use code: CLEAN20 at checkout",      bg: "#0F4C75", accent: "#5BA4CF", cta: "Use Code", img: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: 3, tag: "Weekend Special", title: "Deep Clean Bundle", highlight: "Save 30%",  sub: "Kitchen + Bathroom + Living Room",    bg: "#1B4332", accent: "#52B788", cta: "Bundle", img: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=300" },
];

const CHAT_MESSAGES = [
  { id: 1, from: "support", text: "Hi! How can I help you today?", time: "9:00 AM" },
  { id: 2, from: "me", text: "I need to reschedule my deep clean for tomorrow.", time: "9:02 AM" },
  { id: 3, from: "support", text: "Of course! What time works best for you?", time: "9:02 AM" },
  { id: 4, from: "me", text: "Can we do 2 PM instead of 10 AM?", time: "9:03 AM" },
  { id: 5, from: "support", text: "Absolutely, I've updated your booking to 2:00 PM. You'll get a confirmation shortly.", time: "9:04 AM" },
];

const BOOKINGS = [
  { id: "b1", service: "Premium Deep Clean", date: "Mon, Jun 29", time: "10:00 AM", status: "confirmed", price: 120, img: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "b2", service: "Bathroom Disinfection", date: "Sat, Jul 5", time: "2:00 PM", status: "pending", price: 55, img: "https://images.pexels.com/photos/7641854/pexels-photo-7641854.jpeg?auto=compress&cs=tinysrgb&w=200" },
];

type Screen = "onboarding" | "home" | "detail" | "explore" | "bookmarks" | "chat" | "profile" | "booking-confirm";
type NavTab = "home" | "explore" | "bookmarks" | "chat" | "profile";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Avatar({ src, size = 36 }: { src: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0 bg-indigo-100" style={{ width: size, height: size }}>
      {!err ? <img src={src} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} /> : null}
    </div>
  );
}

function StarBadge({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.95)" }}>
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-gray-800">{rating}</span>
    </div>
  );
}

// ── Onboarding screen ─────────────────────────────────────────────────────────
function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: C.white }}>
      {/* Hero image — takes upper 60% */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "62%" }}>
        <img
          src="https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=800"
          alt="Cleaning professionals"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay fading into white */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(71,64,212,0.15) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,1) 100%)" }} />
        {/* Top pill */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 shadow-sm">
            <Shield className="w-3.5 h-3.5" style={{ color: C.primary }} />
            <span className="text-xs font-semibold" style={{ color: C.textDark }}>100% Verified Professionals</span>
          </div>
        </div>
      </div>

      {/* Text + CTA */}
      <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-2">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: C.textDark }}>
            Let's Find the{" "}
            <span style={{ color: C.primary }}>Professional Deep Cleaning</span>{" "}
            Service
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: C.textLight }}>
            Book trusted cleaning experts in minutes. Backed by quality guarantees and transparent pricing.
          </p>

          {/* Feature pills */}
          <div className="flex gap-2 flex-wrap pt-1">
            {["Eco-Friendly", "Insured & Bonded", "Same-Day"].map(t => (
              <div key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: C.primaryLight }}>
                <CheckCircle className="w-3 h-3" style={{ color: C.primary }} />
                <span className="text-[11px] font-semibold" style={{ color: C.primary }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}
          >
            Start
          </button>
          <p className="text-center text-sm" style={{ color: C.textLight }}>
            Already have an account?{" "}
            <button onClick={onStart} className="font-bold" style={{ color: C.primary }}>Sign In</button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Promo carousel ────────────────────────────────────────────────────────────
function PromoCarousel() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({ left: active * ref.current.clientWidth, behavior: "smooth" });
    }
  }, [active]);

  return (
    <div className="space-y-2.5">
      <div ref={ref} className="overflow-hidden rounded-2xl" style={{ scrollSnapType: "x mandatory" }}>
        <div className="flex" style={{ width: `${PROMOS.length * 100}%` }}>
          {PROMOS.map((p, i) => (
            <div key={p.id} className="relative overflow-hidden rounded-2xl flex-shrink-0" style={{ width: `${100 / PROMOS.length}%`, background: p.bg }}>
              <div className="flex items-center p-4 gap-3" style={{ minHeight: 110 }}>
                <div className="flex-1">
                  <div className="inline-block px-2 py-0.5 rounded-full mb-1.5 text-[10px] font-bold" style={{ background: p.accent + "33", color: p.accent }}>
                    {p.tag}
                  </div>
                  <p className="text-white/80 text-xs font-medium leading-tight">{p.title}</p>
                  <p className="text-white text-xl font-black leading-tight">{p.highlight}</p>
                  <p className="text-white/50 text-[10px] mt-0.5 leading-tight">{p.sub}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden opacity-80">
                    <img src={p.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: p.accent }}>
                    {p.cta}
                  </button>
                </div>
              </div>
              {i === active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-pulse" style={{ background: p.accent }} />
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5">
        {PROMOS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className="rounded-full transition-all"
            style={{ width: i === active ? 20 : 6, height: 6, background: i === active ? C.primary : C.border }} />
        ))}
      </div>
    </div>
  );
}

// ── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({ svc, saved, onSave, onSelect }: {
  svc: Service; saved: boolean;
  onSave: () => void; onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border flex-shrink-0" style={{ background: C.card, borderColor: C.border, width: 180 }}>
      <div className="relative" style={{ height: 108 }}>
        {!imgErr ? (
          <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: C.primaryLight }}>🧹</div>
        )}
        <div className="absolute top-2 left-2">
          <StarBadge rating={svc.rating} />
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSave(); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.9)" }}>
          {saved
            ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />
            : <Bookmark className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        {svc.popular && (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: C.primary }}>
            Popular
          </div>
        )}
      </div>
      <button onClick={onSelect} className="p-3 text-left w-full">
        <p className="text-xs font-bold leading-tight" style={{ color: C.textDark }}>{svc.name}</p>
        <p className="text-[10px] mt-0.5" style={{ color: C.textLight }}>{svc.duration} · ${svc.price}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Avatar src={svc.providerImg} size={14} />
          <span className="text-[10px]" style={{ color: C.textLight }}>{svc.provider}</span>
        </div>
      </button>
    </div>
  );
}

// ── Home screen ───────────────────────────────────────────────────────────────
function HomeScreen({
  onSelectService, onSelectCategory, savedIds, onToggleSave, onNav,
}: {
  onSelectService: (s: Service) => void;
  onSelectCategory: (id: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onNav: (tab: NavTab) => void;
}) {
  const [search, setSearch] = useState("");
  const popular = SERVICES.filter(s => s.popular || s.rating >= 4.8).slice(0, 4);
  const nearby = SERVICES.filter(s => !s.popular).slice(0, 4);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 space-y-4" style={{ background: C.white }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: C.textLight }}>Good morning,</p>
            <h1 className="text-xl font-black" style={{ color: C.textDark }}>Hello There! 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full flex items-center justify-center relative" style={{ background: C.primaryLight }}>
              <Bell className="w-4 h-4" style={{ color: C.primary }} />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            <Avatar src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80" size={36} />
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border" style={{ background: C.bg, borderColor: C.border }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.textLight }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search services…"
              className="flex-1 text-sm bg-transparent focus:outline-none"
              style={{ color: C.textDark }}
            />
          </div>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.primary }}>
            <SlidersHorizontal className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-6">
        {/* Promo carousel */}
        <PromoCarousel />

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Categories</h2>
            <button className="text-xs font-semibold" style={{ color: C.primary }} onClick={() => onNav("explore")}>See all</button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.slice(0, 4).map(cat => (
              <button key={cat.id} onClick={() => onSelectCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: cat.color, border: `1.5px solid ${cat.iconBg}22` }}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: C.textMid }}>
                  {cat.label.split(" ").slice(0, 2).join(" ")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Services */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Popular Services</h2>
            <button className="text-xs font-semibold" style={{ color: C.primary }} onClick={() => onNav("explore")}>See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {popular.map(svc => (
              <ServiceCard key={svc.id} svc={svc}
                saved={savedIds.has(svc.id)}
                onSave={() => onToggleSave(svc.id)}
                onSelect={() => onSelectService(svc)} />
            ))}
          </div>
        </div>

        {/* Nearby / All */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Nearby Services</h2>
            <button className="text-xs font-semibold" style={{ color: C.primary }}>See all</button>
          </div>
          <div className="space-y-3">
            {nearby.map(svc => (
              <button key={svc.id} onClick={() => onSelectService(svc)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left active:scale-[0.99] transition-transform"
                style={{ background: C.card, borderColor: C.border }}>
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold leading-tight" style={{ color: C.textDark }}>{svc.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold" style={{ color: C.textMid }}>{svc.rating}</span>
                    <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews})</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{svc.duration} · ${svc.price}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button onClick={e => { e.stopPropagation(); onToggleSave(svc.id); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.bg }}>
                    {savedIds.has(svc.id)
                      ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />
                      : <Bookmark className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5" style={{ color: C.textLight }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom padding for nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Service detail screen ─────────────────────────────────────────────────────
function DetailScreen({
  svc, saved, onSave, onBack, onBook,
}: {
  svc: Service; saved: boolean; onSave: () => void; onBack: () => void; onBook: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar" style={{ background: C.bg }}>
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 240 }}>
        {!imgErr ? (
          <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full text-6xl flex items-center justify-center" style={{ background: C.primaryLight }}>🧹</div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 50%, rgba(0,0,0,0.5) 100%)" }} />
        <div className="absolute top-5 left-4 right-4 flex items-center justify-between">
          <button onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: C.textDark }} />
          </button>
          <button onClick={onSave}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
            {saved
              ? <BookmarkCheck className="w-4 h-4" style={{ color: C.primary }} />
              : <Bookmark className="w-4 h-4 text-gray-500" />}
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Title row */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-black leading-tight flex-1" style={{ color: C.textDark }}>{svc.name}</h1>
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-black" style={{ color: C.primary }}>${svc.price}</p>
              <p className="text-xs" style={{ color: C.textLight }}>per session</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold" style={{ color: C.textMid }}>{svc.rating}</span>
              <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" style={{ color: C.textLight }} />
              <span className="text-xs" style={{ color: C.textLight }}>{svc.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" style={{ color: C.textLight }} />
              <span className="text-xs" style={{ color: C.textLight }}>{svc.location}</span>
            </div>
          </div>
        </div>

        {/* Provider */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: C.primaryLight }}>
          <Avatar src={svc.providerImg} size={44} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.provider}</p>
            <p className="text-xs mt-0.5" style={{ color: C.primary }}>Verified Professional</p>
          </div>
          <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.primary }}>
            <Phone className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: C.textDark }}>About This Service</h3>
          <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>{svc.description}</p>
        </div>

        {/* What's included */}
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>What's Included</h3>
          <div className="space-y-2">
            {svc.includes.map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.success + "20" }}>
                  <CheckCircle className="w-3 h-3" style={{ color: C.success }} />
                </div>
                <span className="text-sm" style={{ color: C.textMid }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ borderColor: C.border, background: C.card }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: C.textLight }}>Sessions</p>
            <p className="text-sm font-bold" style={{ color: C.textDark }}>${svc.price * qty} total</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: C.border }}>
              <Minus className="w-3.5 h-3.5" style={{ color: C.textMid }} />
            </button>
            <span className="text-base font-bold w-4 text-center" style={{ color: C.textDark }}>{qty}</span>
            <button onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ background: C.primary }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Book button */}
        <button onClick={onBook}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition-transform"
          style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>
          Book Now · ${svc.price * qty}
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Booking confirm screen ────────────────────────────────────────────────────
function BookingConfirmScreen({ svc, onDone }: { svc: Service; onDone: () => void }) {
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), num: d.getDate() };
  });
  const times = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

  if (confirmed) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 space-y-6" style={{ background: C.white }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: C.success + "20" }}>
          <CheckCircle className="w-10 h-10" style={{ color: C.success }} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black" style={{ color: C.textDark }}>Booking Confirmed!</h2>
          <p className="text-sm" style={{ color: C.textLight }}>
            Your {svc.name} has been scheduled. You'll receive a confirmation shortly.
          </p>
        </div>
        <div className="w-full p-4 rounded-2xl space-y-2.5" style={{ background: C.primaryLight }}>
          {[["Service", svc.name], ["Date", `${dates[selectedDate].label} ${dates[selectedDate].num}`], ["Time", selectedTime ?? "–"], ["Price", `$${svc.price}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-xs" style={{ color: C.textLight }}>{k}</span>
              <span className="text-xs font-bold" style={{ color: C.textDark }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onDone}
          className="w-full py-4 rounded-2xl text-white font-bold" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar" style={{ background: C.bg }}>
      <div className="px-5 pt-5 pb-3 flex items-center gap-3" style={{ background: C.white }}>
        <button onClick={onDone} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
          <ArrowLeft className="w-4 h-4" style={{ color: C.primary }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: C.textDark }}>Schedule Booking</h2>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Service summary */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <img src={svc.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
            <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{svc.duration} · ${svc.price}</p>
          </div>
        </div>

        {/* Date picker */}
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>Select Date</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {dates.map((d, i) => (
              <button key={i} onClick={() => setSelectedDate(i)}
                className="flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl transition-all"
                style={i === selectedDate
                  ? { background: C.primary, color: "#fff" }
                  : { background: C.card, color: C.textMid, border: `1px solid ${C.border}` }}>
                <span className="text-[10px] font-medium">{d.label}</span>
                <span className="text-sm font-bold">{d.num}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time picker */}
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>Select Time</h3>
          <div className="grid grid-cols-4 gap-2">
            {times.map(t => (
              <button key={t} onClick={() => setSelectedTime(t)}
                className="py-2.5 rounded-xl text-[11px] font-semibold transition-all"
                style={selectedTime === t
                  ? { background: C.primary, color: "#fff" }
                  : { background: C.card, color: C.textMid, border: `1px solid ${C.border}` }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: C.textDark }}>Service Address</h3>
          <div className="flex items-center gap-2 p-3.5 rounded-xl border" style={{ background: C.card, borderColor: C.border }}>
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: C.primary }} />
            <input
              defaultValue="123 Main St, Apt 4B"
              className="flex-1 text-sm bg-transparent focus:outline-none"
              style={{ color: C.textMid }}
            />
          </div>
        </div>

        <button
          onClick={() => selectedTime && setConfirmed(true)}
          disabled={!selectedTime}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md transition-opacity"
          style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`, opacity: selectedTime ? 1 : 0.5 }}>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Confirm Booking · ${svc.price}
          </div>
        </button>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Explore screen ────────────────────────────────────────────────────────────
function ExploreScreen({ savedIds, onToggleSave, onSelectService, filterCategory }: {
  savedIds: Set<string>; onToggleSave: (id: string) => void;
  onSelectService: (s: Service) => void; filterCategory?: string;
}) {
  const [activeTab, setActiveTab] = useState(filterCategory ?? "all");
  const [search, setSearch] = useState("");

  const filtered = SERVICES.filter(s => {
    const matchCat = activeTab === "all" || s.category === activeTab;
    const matchQ = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-5 pt-6 pb-4 space-y-4" style={{ background: C.white }}>
        <h1 className="text-xl font-black" style={{ color: C.textDark }}>Explore Services</h1>
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border" style={{ background: C.bg, borderColor: C.border }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.textLight }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all services…"
            className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: C.textDark }} />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5" style={{ color: C.textLight }} /></button>}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[{ id: "all", label: "All" }, ...CATEGORIES.slice(0, 6)].map(c => (
            <button key={c.id} onClick={() => setActiveTab(c.id)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={activeTab === c.id
                ? { background: C.primary, color: "#fff" }
                : { background: C.bg, color: C.textMid, border: `1px solid ${C.border}` }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
        {/* All categories grid */}
        {activeTab === "all" && !search && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ background: cat.color, border: `1.5px solid ${cat.iconBg}22` }}>
                  {cat.icon}
                </div>
                <span className="text-[9px] font-semibold text-center leading-tight" style={{ color: C.textMid }}>
                  {cat.label.split(" ").slice(0, 2).join(" ")}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="text-xs font-semibold mb-1" style={{ color: C.textLight }}>{filtered.length} services found</p>

        {filtered.map(svc => (
          <button key={svc.id} onClick={() => onSelectService(svc)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left"
            style={{ background: C.card, borderColor: C.border }}>
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold" style={{ color: C.textMid }}>{svc.rating}</span>
                <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews})</span>
                <span className="text-xs" style={{ color: C.textLight }}>· {svc.duration}</span>
              </div>
              <p className="text-xs mt-0.5 truncate" style={{ color: C.textLight }}>{svc.description.substring(0, 60)}…</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <p className="text-sm font-black" style={{ color: C.primary }}>${svc.price}</p>
              <button onClick={e => { e.stopPropagation(); onToggleSave(svc.id); }}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.bg }}>
                {savedIds.has(svc.id)
                  ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />
                  : <Bookmark className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-10 h-10 mx-auto mb-3" style={{ color: C.border }} />
            <p className="text-sm font-semibold" style={{ color: C.textLight }}>No services found</p>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Bookmarks screen ──────────────────────────────────────────────────────────
function BookmarksScreen({ savedIds, onToggleSave, onSelectService }: {
  savedIds: Set<string>; onToggleSave: (id: string) => void; onSelectService: (s: Service) => void;
}) {
  const saved = SERVICES.filter(s => savedIds.has(s.id));
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-5 pt-6 pb-4" style={{ background: C.white }}>
        <h1 className="text-xl font-black" style={{ color: C.textDark }}>Saved Services</h1>
        <p className="text-xs mt-1" style={{ color: C.textLight }}>{saved.length} saved</p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
        {saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
              <Bookmark className="w-7 h-7" style={{ color: C.primary }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: C.textLight }}>No saved services yet</p>
            <p className="text-xs text-center" style={{ color: C.textLight }}>Tap the bookmark icon on any service to save it here.</p>
          </div>
        ) : saved.map(svc => (
          <button key={svc.id} onClick={() => onSelectService(svc)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left"
            style={{ background: C.card, borderColor: C.border }}>
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold" style={{ color: C.textMid }}>{svc.rating}</span>
                <span className="text-xs" style={{ color: C.textLight }}>· ${svc.price}</span>
              </div>
            </div>
            <button onClick={e => { e.stopPropagation(); onToggleSave(svc.id); }}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: C.primaryLight }}>
              <BookmarkCheck className="w-4 h-4" style={{ color: C.primary }} />
            </button>
          </button>
        ))}

        {/* Upcoming bookings */}
        {BOOKINGS.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>Upcoming Bookings</h3>
            {BOOKINGS.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-2xl border mb-2" style={{ background: C.card, borderColor: C.border }}>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={b.img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: C.textDark }}>{b.service}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{b.date} · {b.time}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: b.status === "confirmed" ? C.success + "20" : C.accent + "20", color: b.status === "confirmed" ? C.success : C.accent }}>
                  {b.status === "confirmed" ? "Confirmed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Chat screen ───────────────────────────────────────────────────────────────
function ChatScreen() {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { id: Date.now(), from: "me", text, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]);
    setInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, from: "support", text: "Thanks for reaching out! A specialist will follow up within minutes.", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 border-b" style={{ background: C.white, borderColor: C.border }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
          <MessageSquare className="w-4 h-4" style={{ color: C.primary }} />
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: C.textDark }}>Support Chat</h1>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px]" style={{ color: C.success }}>Online · Typically replies instantly</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%] space-y-1">
              <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={m.from === "me"
                  ? { background: C.primary, color: "#fff", borderBottomRightRadius: 4 }
                  : { background: C.card, color: C.textMid, border: `1px solid ${C.border}`, borderBottomLeftRadius: 4 }}>
                {m.text}
              </div>
              <p className={`text-[10px] ${m.from === "me" ? "text-right" : ""}`} style={{ color: C.textLight }}>{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t" style={{ background: C.white, borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ background: C.bg, borderColor: C.border, color: C.textDark }} />
          <button onClick={send}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: input.trim() ? C.primary : C.border }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile screen ────────────────────────────────────────────────────────────
function ProfileScreen({ onSignOut }: { onSignOut: () => void }) {
  const stats = [{ label: "Bookings", value: "12" }, { label: "Reviews", value: "8" }, { label: "Saved", value: "5" }];
  const menu = [
    { icon: Calendar, label: "My Bookings", sub: "View all upcoming and past" },
    { icon: Star, label: "My Reviews", sub: "Rate your experiences" },
    { icon: MapPin, label: "Saved Addresses", sub: "Manage home & office" },
    { icon: Shield, label: "Privacy & Security", sub: "Manage your data" },
    { icon: Bell, label: "Notifications", sub: "Email, SMS preferences" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-6 flex flex-col items-center space-y-3" style={{ background: C.white }}>
        <div className="relative">
          <Avatar src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200" size={80} />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center" style={{ background: C.primary }}>
            <Plus className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-black" style={{ color: C.textDark }}>Alex Johnson</p>
          <p className="text-xs mt-0.5" style={{ color: C.textLight }}>alex.johnson@email.com</p>
        </div>
        {/* Stats */}
        <div className="flex w-full rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
          {stats.map((s, i) => (
            <div key={s.label} className={`flex-1 py-3 text-center ${i > 0 ? "border-l" : ""}`} style={{ borderColor: C.border }}>
              <p className="text-base font-black" style={{ color: C.primary }}>{s.value}</p>
              <p className="text-[10px] font-medium" style={{ color: C.textLight }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {menu.map(({ icon: Icon, label, sub }) => (
          <button key={label}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left"
            style={{ background: C.card, borderColor: C.border }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.primaryLight }}>
              <Icon className="w-4 h-4" style={{ color: C.primary }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: C.textDark }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: C.textLight }} />
          </button>
        ))}

        <button onClick={onSignOut}
          className="w-full p-4 rounded-2xl border mt-2 text-sm font-bold"
          style={{ borderColor: "#FEE2E2", background: "#FFF5F5", color: "#EF4444" }}>
          Sign Out
        </button>
        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Bottom navigation bar ─────────────────────────────────────────────────────
function BottomNav({ active, onSelect }: { active: NavTab; onSelect: (t: NavTab) => void }) {
  const items: { id: NavTab; icon: React.ElementType; label: string }[] = [
    { id: "home",      icon: Home,           label: "Home"      },
    { id: "explore",   icon: Compass,        label: "Explore"   },
    { id: "bookmarks", icon: Bookmark,       label: "Bookmarks" },
    { id: "chat",      icon: MessageSquare,  label: "Chat"      },
    { id: "profile",   icon: User,           label: "Profile"   },
  ];

  return (
    <div className="flex-shrink-0 flex items-center border-t" style={{ background: C.white, borderColor: C.border, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {items.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onSelect(id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all">
            <div className="relative">
              <Icon className="w-5 h-5 transition-all" style={{ color: isActive ? C.primary : C.textLight }} />
              {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: C.primary }} />}
            </div>
            <span className="text-[9px] font-semibold" style={{ color: isActive ? C.primary : C.textLight }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function CleaningApp() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(["s1", "s3"]));
  const [exploreCategory, setExploreCategory] = useState<string | undefined>();

  const toggleSave = (id: string) => setSavedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectService = (svc: Service) => {
    setSelectedService(svc);
    setScreen("detail");
  };

  const selectCategory = (id: string) => {
    setExploreCategory(id);
    setActiveTab("explore");
    setScreen("home");
  };

  const handleNav = (tab: NavTab) => {
    setActiveTab(tab);
    setScreen("home");
  };

  const isMainScreen = screen === "home" || screen === "onboarding";
  void isMainScreen;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
      {/* Mobile phone frame */}
      <div
        className="relative flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: "min(100vw, 390px)",
          height: "min(100vh, 844px)",
          borderRadius: "min(40px, 3vw)",
          background: C.bg,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {screen === "onboarding" && (
          <OnboardingScreen onStart={() => { setScreen("home"); setActiveTab("home"); }} />
        )}

        {screen === "home" && (
          <>
            <div className="flex-1 overflow-hidden">
              {activeTab === "home" && (
                <HomeScreen
                  onSelectService={selectService}
                  onSelectCategory={selectCategory}
                  savedIds={savedIds}
                  onToggleSave={toggleSave}
                  onNav={handleNav}
                />
              )}
              {activeTab === "explore" && (
                <ExploreScreen
                  savedIds={savedIds}
                  onToggleSave={toggleSave}
                  onSelectService={selectService}
                  filterCategory={exploreCategory}
                />
              )}
              {activeTab === "bookmarks" && (
                <BookmarksScreen
                  savedIds={savedIds}
                  onToggleSave={toggleSave}
                  onSelectService={selectService}
                />
              )}
              {activeTab === "chat" && <ChatScreen />}
              {activeTab === "profile" && <ProfileScreen onSignOut={() => setScreen("onboarding")} />}
            </div>
            <BottomNav active={activeTab} onSelect={tab => { setActiveTab(tab); setExploreCategory(undefined); }} />
          </>
        )}

        {screen === "detail" && selectedService && (
          <DetailScreen
            svc={selectedService}
            saved={savedIds.has(selectedService.id)}
            onSave={() => toggleSave(selectedService.id)}
            onBack={() => { setScreen("home"); setSelectedService(null); }}
            onBook={() => setScreen("booking-confirm")}
          />
        )}

        {screen === "booking-confirm" && selectedService && (
          <BookingConfirmScreen
            svc={selectedService}
            onDone={() => { setScreen("home"); setActiveTab("home"); setSelectedService(null); }}
          />
        )}
      </div>
    </div>
  );
}
