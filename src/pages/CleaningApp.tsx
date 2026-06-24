import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck, Star, Hop as Home, Compass, MessageSquare, User, ChevronRight, MapPin, Clock, CircleCheck as CheckCircle, ArrowLeft, Send, Phone, Shield, Sparkles, X, Plus, Minus, Calendar, Bell, Menu } from "lucide-react";

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  primary: "#4740D4",
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

// ── Viewport hook ─────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "deep",     label: "Deep Cleaning",        icon: "🧹", color: "#EEF2FF", iconBg: "#4740D4" },
  { id: "kitchen",  label: "Kitchen Cleaning",      icon: "🍽️", color: "#FFF7ED", iconBg: "#F97316" },
  { id: "bathroom", label: "Bathroom Disinfection", icon: "🚿", color: "#F0FDF4", iconBg: "#22C55E" },
  { id: "window",   label: "Window Washing",        icon: "🪟", color: "#EFF6FF", iconBg: "#3B82F6" },
  { id: "carpet",   label: "Carpet Cleaning",       icon: "🏠", color: "#FDF4FF", iconBg: "#A855F7" },
  { id: "laundry",  label: "Laundry & Ironing",     icon: "👕", color: "#FFF1F2", iconBg: "#F43F5E" },
  { id: "outdoor",  label: "Outdoor Cleaning",      icon: "🌿", color: "#F0FDF4", iconBg: "#16A34A" },
  { id: "office",   label: "Office Cleaning",       icon: "💼", color: "#F8FAFC", iconBg: "#64748B" },
];

interface Service {
  id: string; name: string; category: string;
  rating: number; reviews: number; price: number; duration: string;
  image: string; provider: string; providerImg: string;
  description: string; includes: string[]; location: string; popular?: boolean;
}

const SERVICES: Service[] = [
  { id: "s1", name: "Premium Deep Clean",      category: "deep",     rating: 4.9, reviews: 284, price: 120, duration: "3–4 hrs", image: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "CleanPro Team",  providerImg: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80",  description: "Our most thorough clean — every surface, corner, and hidden area professionally sanitized with eco-friendly products.", includes: ["All rooms vacuumed & mopped", "Surfaces disinfected", "Inside fridge & oven", "Baseboards & light switches", "Bathroom deep scrub"], location: "Available citywide", popular: true },
  { id: "s2", name: "Kitchen Deep Clean",       category: "kitchen",  rating: 4.8, reviews: 192, price: 75,  duration: "1–2 hrs", image: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "ShineBright Co.", providerImg: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Specialist kitchen cleaning — grease, grime, and bacteria eliminated from every appliance and surface.", includes: ["Stovetop & oven degreasing", "Cabinet exterior wipe-down", "Sink & faucet polish", "Countertop disinfection", "Microwave interior"], location: "Available citywide" },
  { id: "s3", name: "Bathroom Disinfection",    category: "bathroom", rating: 4.9, reviews: 156, price: 55,  duration: "45–60 min", image: "https://images.pexels.com/photos/7641854/pexels-photo-7641854.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "HygieneFirst",  providerImg: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Hospital-grade disinfection for your bathroom — mold-free, germ-free, and sparkling clean.", includes: ["Toilet disinfection", "Grout scrubbing", "Mirror & glass polish", "Floor deep clean", "Drain unclogging"], location: "Available citywide", popular: true },
  { id: "s4", name: "Window & Glass Wash",      category: "window",   rating: 4.7, reviews: 118, price: 60,  duration: "1–2 hrs", image: "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "ClearView Pro", providerImg: "https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Streak-free windows inside and out. We handle the ladders and equipment.", includes: ["Interior window cleaning", "Exterior window cleaning", "Frame & sill wipe-down", "Screen cleaning", "Streak-free guarantee"], location: "Available citywide" },
  { id: "s5", name: "Full Home Standard Clean", category: "deep",     rating: 4.8, reviews: 341, price: 89,  duration: "2–3 hrs", image: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "CleanPro Team",  providerImg: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80",  description: "A thorough standard clean for your whole home. Perfect for weekly or bi-weekly maintenance.", includes: ["Dusting all surfaces", "Vacuuming & mopping", "Bathroom & kitchen clean", "Trash removal", "Bed making"], location: "Available citywide" },
  { id: "s6", name: "Carpet Steam Cleaning",    category: "carpet",   rating: 4.6, reviews: 87,  price: 95,  duration: "2–3 hrs", image: "https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "SteamMaster",   providerImg: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Professional hot-water extraction removes stains, allergens, and deep-set dirt from your carpets.", includes: ["Pre-treatment spray", "Hot-water extraction", "Stain removal", "Deodorizer applied", "Fast drying formula"], location: "Available citywide" },
  { id: "s7", name: "Outdoor Patio Clean",      category: "outdoor",  rating: 4.7, reviews: 64,  price: 80,  duration: "2 hrs",   image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "GreenClean Co.", providerImg: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Power washing and deep cleaning for patios, decks, driveways, and outdoor furniture.", includes: ["Pressure washing", "Furniture wipe-down", "Drain clearing", "Weed blowing", "Eco soap rinse"], location: "Available citywide" },
  { id: "s8", name: "Office Deep Clean",        category: "office",   rating: 4.8, reviews: 109, price: 150, duration: "3–5 hrs", image: "https://images.pexels.com/photos/1170412/pexels-photo-1170412.jpeg?auto=compress&cs=tinysrgb&w=600", provider: "ProOffice",     providerImg: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80",    description: "Comprehensive office cleaning to keep your workspace spotless and professional.", includes: ["Desks & surfaces sanitized", "Floors vacuumed & mopped", "Kitchen area cleaned", "Bins emptied", "Restrooms disinfected"], location: "Available citywide" },
];

const PROMOS = [
  { id: 1, tag: "Limited Time!", title: "Get Special Offer", highlight: "Up to 40% Off",  sub: "All Services · T&C Applied",      bg: "#232066", accent: "#7C7FE8", cta: "Claim",    img: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: 2, tag: "New Users!",    title: "First Booking Deal", highlight: "Flat $20 Off",  sub: "Use code: CLEAN20 at checkout",   bg: "#0F4C75", accent: "#5BA4CF", cta: "Use Code", img: "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=300" },
  { id: 3, tag: "Bundle Deal",   title: "Deep Clean Bundle",  highlight: "Save 30%",      sub: "Kitchen + Bathroom + Living Room", bg: "#1B4332", accent: "#52B788", cta: "Bundle",   img: "https://images.pexels.com/photos/2724749/pexels-photo-2724749.jpeg?auto=compress&cs=tinysrgb&w=300" },
];

const CHAT_MESSAGES = [
  { id: 1, from: "support", text: "Hi! How can we help you today?",                                                                      time: "9:00 AM" },
  { id: 2, from: "me",      text: "I need to reschedule my deep clean for tomorrow.",                                                     time: "9:02 AM" },
  { id: 3, from: "support", text: "Of course! What time works best for you?",                                                            time: "9:02 AM" },
  { id: 4, from: "me",      text: "Can we do 2 PM instead of 10 AM?",                                                                    time: "9:03 AM" },
  { id: 5, from: "support", text: "Absolutely, I've updated your booking to 2:00 PM. You'll get a confirmation shortly.",               time: "9:04 AM" },
];

const BOOKINGS = [
  { id: "b1", service: "Premium Deep Clean",   date: "Mon, Jun 29", time: "10:00 AM", status: "confirmed", price: 120, img: "https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "b2", service: "Bathroom Disinfection", date: "Sat, Jul 5",  time: "2:00 PM",  status: "pending",   price: 55,  img: "https://images.pexels.com/photos/7641854/pexels-photo-7641854.jpeg?auto=compress&cs=tinysrgb&w=200" },
];

type Screen = "onboarding" | "home" | "detail" | "explore" | "bookmarks" | "chat" | "profile" | "booking-confirm";
type NavTab  = "home" | "explore" | "bookmarks" | "chat" | "profile";

// ── Shared helpers ────────────────────────────────────────────────────────────
function Avatar({ src, size = 36 }: { src: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size, background: C.primaryLight }}>
      {!err && <img src={src} alt="" className="w-full h-full object-cover" onError={() => setErr(true)} />}
    </div>
  );
}

function StarBadge({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.95)" }}>
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      <span className="text-[10px] font-bold text-gray-800">{rating}</span>
    </span>
  );
}

// ── Promo carousel ────────────────────────────────────────────────────────────
function PromoCarousel({ desktop }: { desktop?: boolean }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % PROMOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTo({ left: active * ref.current.clientWidth, behavior: "smooth" });
  }, [active]);

  if (desktop) {
    // Desktop: show all three as a grid
    return (
      <div className="grid grid-cols-3 gap-5">
        {PROMOS.map((p, i) => (
          <div key={p.id} className="relative overflow-hidden rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform" style={{ background: p.bg }}>
            <div className="flex items-center p-5 gap-3" style={{ minHeight: 120 }}>
              <div className="flex-1">
                <div className="inline-block px-2 py-0.5 rounded-full mb-2 text-xs font-bold" style={{ background: p.accent + "33", color: p.accent }}>{p.tag}</div>
                <p className="text-white/80 text-sm font-medium">{p.title}</p>
                <p className="text-white text-2xl font-black">{p.highlight}</p>
                <p className="text-white/50 text-xs mt-1">{p.sub}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="w-20 h-16 rounded-xl overflow-hidden opacity-80">
                  <img src={p.img} alt="" className="w-full h-full object-cover" />
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: p.accent }}>{p.cta}</button>
              </div>
            </div>
            {i === active && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: p.accent }} />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div ref={ref} className="overflow-hidden rounded-2xl">
        <div className="flex" style={{ width: `${PROMOS.length * 100}%` }}>
          {PROMOS.map(p => (
            <div key={p.id} className="relative overflow-hidden rounded-2xl flex-shrink-0" style={{ width: `${100 / PROMOS.length}%`, background: p.bg }}>
              <div className="flex items-center p-4 gap-3" style={{ minHeight: 110 }}>
                <div className="flex-1">
                  <div className="inline-block px-2 py-0.5 rounded-full mb-1.5 text-[10px] font-bold" style={{ background: p.accent + "33", color: p.accent }}>{p.tag}</div>
                  <p className="text-white/80 text-xs font-medium">{p.title}</p>
                  <p className="text-white text-xl font-black">{p.highlight}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{p.sub}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden opacity-80">
                    <img src={p.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: p.accent }}>{p.cta}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        {PROMOS.map((_, i) => (
          <button key={i} onClick={() => setActive(i)} className="rounded-full transition-all"
            style={{ width: i === active ? 20 : 6, height: 6, background: i === active ? C.primary : C.border }} />
        ))}
      </div>
    </div>
  );
}

// ── Service card (shared) ─────────────────────────────────────────────────────
function ServiceCard({ svc, saved, onSave, onSelect, wide }: {
  svc: Service; saved: boolean; onSave: () => void; onSelect: () => void; wide?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      onClick={onSelect}
      className="rounded-2xl overflow-hidden shadow-sm border cursor-pointer group"
      style={{ background: C.card, borderColor: C.border, width: wide ? "100%" : 186, flexShrink: wide ? undefined : 0 }}
    >
      <div className="relative overflow-hidden" style={{ height: wide ? 180 : 110 }}>
        {!imgErr
          ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={() => setImgErr(true)} />
          : <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: C.primaryLight }}>🧹</div>
        }
        <div className="absolute top-2 left-2"><StarBadge rating={svc.rating} /></div>
        <button onClick={e => { e.stopPropagation(); onSave(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
          style={{ background: "rgba(255,255,255,0.95)" }}>
          {saved
            ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />
            : <Bookmark className="w-3.5 h-3.5 text-gray-400" />}
        </button>
        {svc.popular && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: C.primary }}>Popular</div>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold leading-tight" style={{ color: C.textDark, fontSize: wide ? 15 : 12 }}>{svc.name}</p>
        <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{svc.duration} · <span className="font-bold" style={{ color: C.primary }}>${svc.price}</span></p>
        {wide && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: C.textLight }}>{svc.description}</p>}
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar src={svc.providerImg} size={16} />
          <span className="text-[10px]" style={{ color: C.textLight }}>{svc.provider}</span>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel / modal (shared between mobile screen and desktop modal) ─────
function DetailContent({ svc, saved, onSave, onBook }: {
  svc: Service; saved: boolean; onSave: () => void; onBook: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="relative flex-shrink-0" style={{ height: 240 }}>
        {!imgErr
          ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          : <div className="w-full h-full text-6xl flex items-center justify-center" style={{ background: C.primaryLight }}>🧹</div>
        }
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,.25) 0%,transparent 45%,rgba(0,0,0,.5) 100%)" }} />
        <button onClick={onSave}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
          {saved ? <BookmarkCheck className="w-5 h-5" style={{ color: C.primary }} /> : <Bookmark className="w-5 h-5 text-gray-500" />}
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 flex-1" style={{ background: C.bg }}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black leading-tight flex-1" style={{ color: C.textDark }}>{svc.name}</h2>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black" style={{ color: C.primary }}>${svc.price}</p>
            <p className="text-xs" style={{ color: C.textLight }}>per session</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold" style={{ color: C.textMid }}>{svc.rating}</span>
            <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews})</span>
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

        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: C.primaryLight }}>
          <Avatar src={svc.providerImg} size={44} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.provider}</p>
            <p className="text-xs mt-0.5" style={{ color: C.primary }}>Verified Professional</p>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.primary }}>
            <Phone className="w-4 h-4 text-white" />
          </button>
        </div>

        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: C.textDark }}>About This Service</h3>
          <p className="text-sm leading-relaxed" style={{ color: C.textMid }}>{svc.description}</p>
        </div>

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

        <button onClick={onBook}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md hover:opacity-90 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>
          Book Now · ${svc.price * qty}
        </button>
        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Booking schedule (shared) ─────────────────────────────────────────────────
function BookingSchedule({ svc, onDone }: { svc: Service; onDone: () => void }) {
  const [selDate, setSelDate] = useState(0);
  const [selTime, setSelTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { label: d.toLocaleDateString("en-US", { weekday: "short" }), num: d.getDate() };
  });
  const times = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 space-y-6 text-center" style={{ background: C.white }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: C.success + "20" }}>
          <CheckCircle className="w-10 h-10" style={{ color: C.success }} />
        </div>
        <div>
          <h2 className="text-2xl font-black" style={{ color: C.textDark }}>Booking Confirmed!</h2>
          <p className="text-sm mt-2" style={{ color: C.textLight }}>Your {svc.name} is scheduled. A confirmation will be sent shortly.</p>
        </div>
        <div className="w-full p-4 rounded-2xl space-y-2.5" style={{ background: C.primaryLight }}>
          {[["Service", svc.name], ["Date", `${dates[selDate].label} ${dates[selDate].num}`], ["Time", selTime ?? "–"], ["Price", `$${svc.price}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-xs" style={{ color: C.textLight }}>{k}</span>
              <span className="text-xs font-bold" style={{ color: C.textDark }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onDone} className="w-full py-4 rounded-2xl text-white font-bold"
          style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>Done</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar px-6 py-6 space-y-6" style={{ background: C.bg }}>
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          <img src={svc.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
          <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{svc.duration} · ${svc.price}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>Select Date</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {dates.map((d, i) => (
            <button key={i} onClick={() => setSelDate(i)}
              className="flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl transition-all"
              style={i === selDate ? { background: C.primary, color: "#fff" } : { background: C.card, color: C.textMid, border: `1px solid ${C.border}` }}>
              <span className="text-[10px] font-medium">{d.label}</span>
              <span className="text-sm font-bold">{d.num}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: C.textDark }}>Select Time</h3>
        <div className="grid grid-cols-4 gap-2">
          {times.map(t => (
            <button key={t} onClick={() => setSelTime(t)}
              className="py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={selTime === t ? { background: C.primary, color: "#fff" } : { background: C.card, color: C.textMid, border: `1px solid ${C.border}` }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: C.textDark }}>Service Address</h3>
        <div className="flex items-center gap-2 p-3.5 rounded-xl border" style={{ background: C.card, borderColor: C.border }}>
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: C.primary }} />
          <input defaultValue="123 Main St, Apt 4B" className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: C.textMid }} />
        </div>
      </div>

      <button onClick={() => selTime && setConfirmed(true)} disabled={!selTime}
        className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md hover:opacity-90 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})`, opacity: selTime ? 1 : 0.5 }}>
        <span className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" /> Confirm Booking · ${svc.price}
        </span>
      </button>
    </div>
  );
}

// ── Chat content (shared) ─────────────────────────────────────────────────────
function ChatContent() {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const text = input.trim(); if (!text) return;
    setMessages(prev => [...prev, { id: Date.now(), from: "me", text, time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]);
    setInput("");
    setTimeout(() => setMessages(prev => [...prev, { id: Date.now() + 1, from: "support", text: "Thanks! A specialist will follow up shortly.", time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }]), 1200);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
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
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ background: C.bg, borderColor: C.border, color: C.textDark }} />
          <button onClick={send} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: input.trim() ? C.primary : C.border }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile content (shared) ──────────────────────────────────────────────────
function ProfileContent({ onSignOut }: { onSignOut: () => void }) {
  const stats = [{ label: "Bookings", value: "12" }, { label: "Reviews", value: "8" }, { label: "Saved", value: "5" }];
  const menu = [
    { icon: Calendar, label: "My Bookings", sub: "View all upcoming and past" },
    { icon: Star,     label: "My Reviews",  sub: "Rate your experiences" },
    { icon: MapPin,   label: "Addresses",   sub: "Manage home & office" },
    { icon: Shield,   label: "Privacy",     sub: "Manage your data" },
    { icon: Bell,     label: "Notifications", sub: "Email, SMS preferences" },
  ];
  return (
    <div className="h-full overflow-y-auto no-scrollbar" style={{ background: C.bg }}>
      <div className="px-6 pt-8 pb-6 flex flex-col items-center space-y-4" style={{ background: C.white }}>
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
        <div className="flex w-full rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
          {stats.map((s, i) => (
            <div key={s.label} className={`flex-1 py-3 text-center ${i > 0 ? "border-l" : ""}`} style={{ borderColor: C.border }}>
              <p className="text-lg font-black" style={{ color: C.primary }}>{s.value}</p>
              <p className="text-[10px] font-medium" style={{ color: C.textLight }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 space-y-2">
        {menu.map(({ icon: Icon, label, sub }) => (
          <button key={label} className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left hover:bg-gray-50 transition-colors"
            style={{ background: C.card, borderColor: C.border }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.primaryLight }}>
              <Icon className="w-4 h-4" style={{ color: C.primary }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: C.textDark }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: C.textLight }} />
          </button>
        ))}
        <button onClick={onSignOut} className="w-full p-4 rounded-2xl border mt-2 text-sm font-bold"
          style={{ borderColor: "#FEE2E2", background: "#FFF5F5", color: "#EF4444" }}>Sign Out</button>
        <div className="h-4" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DESKTOP LAYOUT
// ══════════════════════════════════════════════════════════════════════════════
function DesktopLayout({ savedIds, onToggleSave }: { savedIds: Set<string>; onToggleSave: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(true);

  const openDetail = (svc: Service) => { setSelectedService(svc); setDetailOpen(true); setBookingOpen(false); };
  const openBooking = () => { setDetailOpen(false); setBookingOpen(true); };

  const filtered = SERVICES.filter(s => {
    const matchCat = catFilter === "all" || s.category === catFilter;
    const matchQ = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const popular = SERVICES.filter(s => s.popular || s.rating >= 4.8);

  const navLinks: { id: NavTab; label: string }[] = [
    { id: "home", label: "Home" },
    { id: "explore", label: "Services" },
    { id: "bookmarks", label: "My Bookings" },
    { id: "chat", label: "Support" },
    { id: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'Inter',system-ui,sans-serif" }}>

      {/* ── Desktop top nav ── */}
      <header className="sticky top-0 z-40 border-b shadow-sm" style={{ background: C.white, borderColor: C.border }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>
              🧹
            </div>
            <span className="text-base font-black" style={{ color: C.primary }}>CleanPro</span>
          </button>

          {/* Nav links — hidden on small */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map(n => (
              <button key={n.id} onClick={() => setActiveTab(n.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ color: activeTab === n.id ? C.primary : C.textMid, background: activeTab === n.id ? C.primaryLight : "transparent" }}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm" style={{ background: C.bg, borderColor: C.border }}>
              <Search className="w-4 h-4" style={{ color: C.textLight }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
                className="bg-transparent focus:outline-none text-sm w-36" style={{ color: C.textDark }} />
            </div>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center relative" style={{ background: C.primaryLight }}>
              <Bell className="w-4 h-4" style={{ color: C.primary }} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>
            {signedIn
              ? <Avatar src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80" size={36} />
              : (
                <button onClick={() => setSignedIn(true)}
                  className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{ background: C.primary }}>
                  Sign In
                </button>
              )
            }
          </div>

          {/* Hamburger — mobile only */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(v => !v)}>
            <Menu className="w-5 h-5" style={{ color: C.textDark }} />
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ background: C.white, borderColor: C.border }}>
            {navLinks.map(n => (
              <button key={n.id} onClick={() => { setActiveTab(n.id); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: activeTab === n.id ? C.primary : C.textMid, background: activeTab === n.id ? C.primaryLight : "transparent" }}>
                {n.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Page body ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* HOME */}
        {activeTab === "home" && (
          <div className="space-y-12">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 340, background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primaryMid} 100%)` }}>
              <img
                src="https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Cleaning" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
              />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-8 sm:px-14 py-12 gap-8">
                <div className="space-y-5 max-w-xl">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit" style={{ background: "rgba(255,255,255,0.15)" }}>
                    <Shield className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-semibold">100% Verified Professionals</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                    Let's Find the<br />
                    <span style={{ color: "#A5B4FC" }}>Professional Deep Cleaning</span> Service
                  </h1>
                  <p className="text-white/70 text-sm leading-relaxed max-w-sm">
                    Book trusted cleaning experts in minutes — eco-friendly, insured, and satisfaction guaranteed.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {["Eco-Friendly", "Insured & Bonded", "Same-Day Available"].map(t => (
                      <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <CheckCircle className="w-3 h-3 text-emerald-300" />
                        <span className="text-white text-xs font-semibold">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setActiveTab("explore")}
                      className="px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                      style={{ background: C.white, color: C.primary }}>
                      Book a Service
                    </button>
                    <button onClick={() => setActiveTab("explore")}
                      className="px-6 py-3 rounded-xl font-bold text-sm border border-white/30 text-white hover:bg-white/10 transition-colors">
                      Explore All
                    </button>
                  </div>
                </div>
                <div className="hidden md:grid grid-cols-2 gap-3 flex-shrink-0">
                  {[{ value: "500+", label: "Professionals" }, { value: "4.9★", label: "Avg Rating" }, { value: "10k+", label: "Cleanings Done" }, { value: "98%", label: "Satisfaction" }].map(s => (
                    <div key={s.label} className="flex flex-col items-center py-4 px-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.12)" }}>
                      <p className="text-2xl font-black text-white">{s.value}</p>
                      <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black" style={{ color: C.textDark }}>Categories</h2>
                <button onClick={() => setActiveTab("explore")} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.primary }}>
                  See all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setCatFilter(cat.id); setActiveTab("explore"); }}
                    className="flex flex-col items-center gap-2 group">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform"
                      style={{ background: cat.color, border: `1.5px solid ${cat.iconBg}22` }}>
                      {cat.icon}
                    </div>
                    <span className="text-xs font-semibold text-center leading-tight" style={{ color: C.textMid }}>
                      {cat.label.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Promos */}
            <div>
              <h2 className="text-xl font-black mb-6" style={{ color: C.textDark }}>Special Offers</h2>
              <PromoCarousel desktop />
            </div>

            {/* Popular services */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black" style={{ color: C.textDark }}>Popular Services</h2>
                <button onClick={() => setActiveTab("explore")} className="flex items-center gap-1 text-sm font-semibold" style={{ color: C.primary }}>
                  See all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {popular.map(svc => (
                  <ServiceCard key={svc.id} svc={svc} wide saved={savedIds.has(svc.id)} onSave={() => onToggleSave(svc.id)} onSelect={() => openDetail(svc)} />
                ))}
              </div>
            </div>

            {/* Stats bar */}
            <div className="rounded-3xl p-8 grid grid-cols-2 sm:grid-cols-4 gap-6"
              style={{ background: `linear-gradient(135deg, ${C.primaryDark}, ${C.primaryMid})` }}>
              {[{ v: "500+", l: "Vetted Professionals" }, { v: "10k+", l: "Happy Customers" }, { v: "4.9★", l: "Average Rating" }, { v: "98%", l: "Satisfaction Rate" }].map(s => (
                <div key={s.l} className="text-center">
                  <p className="text-3xl font-black text-white">{s.v}</p>
                  <p className="text-white/60 text-sm mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPLORE / SERVICES */}
        {activeTab === "explore" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black" style={{ color: C.textDark }}>All Services</h1>
              <p className="text-sm" style={{ color: C.textLight }}>{filtered.length} services available</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[{ id: "all", label: "All" }, ...CATEGORIES].map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={catFilter === c.id
                    ? { background: C.primary, color: "#fff" }
                    : { background: C.white, color: C.textMid, border: `1px solid ${C.border}` }}>
                  {c.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-24">
                <Sparkles className="w-12 h-12 mb-3" style={{ color: C.border }} />
                <p className="font-semibold" style={{ color: C.textLight }}>No services found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {filtered.map(svc => (
                  <ServiceCard key={svc.id} svc={svc} wide saved={savedIds.has(svc.id)} onSave={() => onToggleSave(svc.id)} onSelect={() => openDetail(svc)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* BOOKMARKS / MY BOOKINGS */}
        {activeTab === "bookmarks" && (
          <div className="max-w-3xl">
            <h1 className="text-2xl font-black mb-6" style={{ color: C.textDark }}>Saved & Upcoming</h1>

            {/* Upcoming bookings */}
            <h3 className="text-sm font-bold mb-3" style={{ color: C.textMid }}>Upcoming Bookings</h3>
            <div className="space-y-3 mb-8">
              {BOOKINGS.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={b.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: C.textDark }}>{b.service}</p>
                    <p className="text-sm mt-0.5" style={{ color: C.textLight }}>{b.date} · {b.time}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: C.primary }}>${b.price}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background: b.status === "confirmed" ? C.success + "20" : C.accent + "20", color: b.status === "confirmed" ? C.success : C.accent }}>
                    {b.status === "confirmed" ? "Confirmed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>

            {/* Saved */}
            <h3 className="text-sm font-bold mb-3" style={{ color: C.textMid }}>Saved Services</h3>
            {SERVICES.filter(s => savedIds.has(s.id)).length === 0 ? (
              <div className="flex flex-col items-center py-12 rounded-2xl border" style={{ borderColor: C.border }}>
                <Bookmark className="w-10 h-10 mb-3" style={{ color: C.border }} />
                <p className="font-semibold" style={{ color: C.textLight }}>No saved services yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {SERVICES.filter(s => savedIds.has(s.id)).map(svc => (
                  <ServiceCard key={svc.id} svc={svc} wide saved onSave={() => onToggleSave(svc.id)} onSelect={() => openDetail(svc)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT */}
        {activeTab === "chat" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.primaryLight }}>
                <MessageSquare className="w-5 h-5" style={{ color: C.primary }} />
              </div>
              <div>
                <h1 className="text-base font-black" style={{ color: C.textDark }}>Support Chat</h1>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs" style={{ color: C.success }}>Online</span>
                </div>
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden border shadow-sm" style={{ height: 520, borderColor: C.border }}>
              <ChatContent />
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-3xl overflow-hidden border shadow-sm" style={{ borderColor: C.border, height: 600 }}>
              <ProfileContent onSignOut={() => setSignedIn(false)} />
            </div>
          </div>
        )}
      </main>

      {/* ── Service detail modal ── */}
      {detailOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setDetailOpen(false)}>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg" style={{ maxHeight: "90vh", background: C.white }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setDetailOpen(false)}
              className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow"
              style={{ background: "rgba(255,255,255,0.95)" }}>
              <X className="w-4 h-4" style={{ color: C.textDark }} />
            </button>
            <DetailContent
              svc={selectedService}
              saved={savedIds.has(selectedService.id)}
              onSave={() => onToggleSave(selectedService.id)}
              onBook={openBooking}
            />
          </div>
        </div>
      )}

      {/* ── Booking modal ── */}
      {bookingOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setBookingOpen(false)}>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg" style={{ maxHeight: "90vh", background: C.white }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b" style={{ borderColor: C.border }}>
              <button onClick={() => { setBookingOpen(false); setDetailOpen(true); }}
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
                <ArrowLeft className="w-4 h-4" style={{ color: C.primary }} />
              </button>
              <h2 className="text-base font-bold" style={{ color: C.textDark }}>Schedule Booking</h2>
            </div>
            <div style={{ height: "calc(90vh - 60px)" }}>
              <BookingSchedule svc={selectedService} onDone={() => setBookingOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t" style={{ background: C.primaryDark, borderColor: C.primaryDark }}>
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🧹</span>
                <span className="text-base font-black text-white">CleanPro</span>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">Professional cleaning services you can trust.</p>
            </div>
            {[
              { title: "Services", items: ["Deep Cleaning", "Kitchen", "Bathroom", "Windows"] },
              { title: "Company", items: ["About Us", "Careers", "Blog", "Press"] },
              { title: "Support", items: ["Help Center", "Contact Us", "Privacy", "Terms"] },
            ].map(col => (
              <div key={col.title}>
                <p className="text-white font-bold text-sm mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.items.map(item => (
                    <li key={item} className="text-white/50 text-xs hover:text-white/80 cursor-pointer transition-colors">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/40 text-xs">© 2026 CleanPro. All rights reserved.</p>
            <div className="flex gap-4">
              {["Twitter", "Instagram", "LinkedIn"].map(s => (
                <span key={s} className="text-white/40 text-xs hover:text-white/70 cursor-pointer transition-colors">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE LAYOUT (phone-native app experience)
// ══════════════════════════════════════════════════════════════════════════════
function MobileApp({ savedIds, onToggleSave }: { savedIds: Set<string>; onToggleSave: (id: string) => void }) {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const openDetail = (svc: Service) => { setSelectedService(svc); setScreen("detail"); };
  const openBooking = () => setScreen("booking-confirm");

  const NavBar = () => {
    const items: { id: NavTab; icon: React.ElementType; label: string }[] = [
      { id: "home",      icon: Home,          label: "Home"      },
      { id: "explore",   icon: Compass,       label: "Explore"   },
      { id: "bookmarks", icon: Bookmark,      label: "Bookmarks" },
      { id: "chat",      icon: MessageSquare, label: "Chat"      },
      { id: "profile",   icon: User,          label: "Profile"   },
    ];
    return (
      <div className="flex-shrink-0 flex items-center border-t" style={{ background: C.white, borderColor: C.border }}>
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); setScreen("home"); }}
              className="flex-1 flex flex-col items-center gap-1 py-3">
              <Icon className="w-5 h-5" style={{ color: isActive ? C.primary : C.textLight }} />
              <span className="text-[9px] font-semibold" style={{ color: isActive ? C.primary : C.textLight }}>{label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  if (screen === "onboarding") {
    return (
      <div className="flex flex-col h-full" style={{ background: C.white }}>
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: "62%" }}>
          <img src="https://images.pexels.com/photos/4107278/pexels-photo-4107278.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(71,64,212,.15) 0%,rgba(255,255,255,0) 50%,rgba(255,255,255,1) 100%)" }} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 shadow-sm">
              <Shield className="w-3.5 h-3.5" style={{ color: C.primary }} />
              <span className="text-xs font-semibold" style={{ color: C.textDark }}>100% Verified Professionals</span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between px-6 pb-8 pt-2">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold leading-tight" style={{ color: C.textDark }}>
              Let's Find the <span style={{ color: C.primary }}>Professional Deep Cleaning</span> Service
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: C.textLight }}>
              Book trusted cleaning experts in minutes. Backed by quality guarantees and transparent pricing.
            </p>
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
            <button onClick={() => { setScreen("home"); setActiveTab("home"); }}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg"
              style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.primaryMid})` }}>
              Start
            </button>
            <p className="text-center text-sm" style={{ color: C.textLight }}>
              Already have an account?{" "}
              <button onClick={() => { setScreen("home"); setActiveTab("home"); }} className="font-bold" style={{ color: C.primary }}>Sign In</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "home") {
    return (
      <div className="flex flex-col h-full" style={{ background: C.bg }}>
        <div className="flex-1 overflow-hidden">
          {/* HOME tab */}
          {activeTab === "home" && (
            <div className="h-full overflow-y-auto no-scrollbar">
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
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border" style={{ background: C.bg, borderColor: C.border }}>
                    <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.textLight }} />
                    <input placeholder="Search services…" className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: C.textDark }} />
                  </div>
                  <button className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.primary }}>
                    <SlidersHorizontal className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <div className="px-5 py-4 space-y-6">
                <PromoCarousel />
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Categories</h2>
                    <button onClick={() => setActiveTab("explore")} className="text-xs font-semibold" style={{ color: C.primary }}>See all</button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {CATEGORIES.slice(0, 4).map(cat => (
                      <button key={cat.id} onClick={() => setActiveTab("explore")} className="flex flex-col items-center gap-1.5">
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
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Popular Services</h2>
                    <button onClick={() => setActiveTab("explore")} className="text-xs font-semibold" style={{ color: C.primary }}>See all</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                    {SERVICES.filter(s => s.popular || s.rating >= 4.8).map(svc => (
                      <ServiceCard key={svc.id} svc={svc} saved={savedIds.has(svc.id)} onSave={() => onToggleSave(svc.id)} onSelect={() => openDetail(svc)} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-bold" style={{ color: C.textDark }}>Nearby Services</h2>
                    <button className="text-xs font-semibold" style={{ color: C.primary }}>See all</button>
                  </div>
                  <div className="space-y-3">
                    {SERVICES.slice(3, 7).map(svc => (
                      <button key={svc.id} onClick={() => openDetail(svc)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left"
                        style={{ background: C.card, borderColor: C.border }}>
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={svc.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold" style={{ color: C.textMid }}>{svc.rating}</span>
                            <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews})</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: C.textLight }}>{svc.duration} · ${svc.price}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.textLight }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-4" />
              </div>
            </div>
          )}

          {/* EXPLORE tab */}
          {activeTab === "explore" && (
            <div className="h-full flex flex-col">
              <div className="px-5 pt-6 pb-4 space-y-4" style={{ background: C.white }}>
                <h1 className="text-xl font-black" style={{ color: C.textDark }}>Explore Services</h1>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border" style={{ background: C.bg, borderColor: C.border }}>
                  <Search className="w-4 h-4 flex-shrink-0" style={{ color: C.textLight }} />
                  <input placeholder="Search all services…" className="flex-1 text-sm bg-transparent focus:outline-none" style={{ color: C.textDark }} />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[{ id: "all", label: "All" }, ...CATEGORIES.slice(0, 6)].map(c => (
                    <button key={c.id} className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: C.primary, color: "#fff" }}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
                {SERVICES.map(svc => (
                  <button key={svc.id} onClick={() => openDetail(svc)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left"
                    style={{ background: C.card, borderColor: C.border }}>
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={svc.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-semibold" style={{ color: C.textMid }}>{svc.rating}</span>
                        <span className="text-xs" style={{ color: C.textLight }}>({svc.reviews}) · {svc.duration}</span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: C.textLight }}>{svc.description.substring(0, 55)}…</p>
                    </div>
                    <p className="text-sm font-black flex-shrink-0" style={{ color: C.primary }}>${svc.price}</p>
                  </button>
                ))}
                <div className="h-4" />
              </div>
            </div>
          )}

          {/* BOOKMARKS tab */}
          {activeTab === "bookmarks" && (
            <div className="h-full flex flex-col">
              <div className="px-5 pt-6 pb-4" style={{ background: C.white }}>
                <h1 className="text-xl font-black" style={{ color: C.textDark }}>Saved Services</h1>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
                {SERVICES.filter(s => savedIds.has(s.id)).length === 0
                  ? <div className="flex flex-col items-center py-16"><Bookmark className="w-10 h-10 mb-3" style={{ color: C.border }} /><p className="text-sm" style={{ color: C.textLight }}>No saved services</p></div>
                  : SERVICES.filter(s => savedIds.has(s.id)).map(svc => (
                    <button key={svc.id} onClick={() => openDetail(svc)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left" style={{ background: C.card, borderColor: C.border }}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"><img src={svc.image} alt="" className="w-full h-full object-cover" /></div>
                      <div className="flex-1"><p className="text-sm font-bold" style={{ color: C.textDark }}>{svc.name}</p><p className="text-xs mt-0.5" style={{ color: C.textLight }}>${svc.price} · {svc.rating}★</p></div>
                      <BookmarkCheck className="w-4 h-4 flex-shrink-0" style={{ color: C.primary }} />
                    </button>
                  ))
                }
                <h3 className="text-sm font-bold pt-2" style={{ color: C.textDark }}>Upcoming Bookings</h3>
                {BOOKINGS.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ background: C.card, borderColor: C.border }}>
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"><img src={b.img} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1"><p className="text-sm font-bold" style={{ color: C.textDark }}>{b.service}</p><p className="text-xs mt-0.5" style={{ color: C.textLight }}>{b.date} · {b.time}</p></div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: b.status === "confirmed" ? C.success + "20" : C.accent + "20", color: b.status === "confirmed" ? C.success : C.accent }}>
                      {b.status === "confirmed" ? "✓" : "…"}
                    </span>
                  </div>
                ))}
                <div className="h-4" />
              </div>
            </div>
          )}

          {/* CHAT tab */}
          {activeTab === "chat" && (
            <div className="h-full flex flex-col">
              <div className="px-5 pt-6 pb-4 border-b flex items-center gap-3" style={{ background: C.white, borderColor: C.border }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
                  <MessageSquare className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.textDark }}>Support Chat</p>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px]" style={{ color: C.success }}>Online</span></div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden"><ChatContent /></div>
            </div>
          )}

          {/* PROFILE tab */}
          {activeTab === "profile" && (
            <div className="h-full overflow-hidden">
              <ProfileContent onSignOut={() => setScreen("onboarding")} />
            </div>
          )}
        </div>
        <NavBar />
      </div>
    );
  }

  if (screen === "detail" && selectedService) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden relative">
          <button onClick={() => { setScreen("home"); setSelectedService(null); }}
            className="absolute top-5 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow"
            style={{ background: "rgba(255,255,255,0.92)" }}>
            <ArrowLeft className="w-4 h-4" style={{ color: C.textDark }} />
          </button>
          <DetailContent
            svc={selectedService}
            saved={savedIds.has(selectedService.id)}
            onSave={() => onToggleSave(selectedService.id)}
            onBook={openBooking}
          />
        </div>
      </div>
    );
  }

  if (screen === "booking-confirm" && selectedService) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3 border-b flex-shrink-0" style={{ background: C.white, borderColor: C.border }}>
          <button onClick={() => setScreen("detail")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.primaryLight }}>
            <ArrowLeft className="w-4 h-4" style={{ color: C.primary }} />
          </button>
          <h2 className="text-base font-bold" style={{ color: C.textDark }}>Schedule Booking</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <BookingSchedule svc={selectedService} onDone={() => { setScreen("home"); setActiveTab("home"); setSelectedService(null); }} />
        </div>
      </div>
    );
  }

  return null;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function CleaningApp() {
  const isMobile = useIsMobile();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(["s1", "s3"]));
  const toggleSave = (id: string) => setSavedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (isMobile) {
    return (
      <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", fontFamily: "'Inter',system-ui,sans-serif", background: C.bg }}>
        <MobileApp savedIds={savedIds} onToggleSave={toggleSave} />
      </div>
    );
  }

  return <DesktopLayout savedIds={savedIds} onToggleSave={toggleSave} />;
}
