import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scissors, ChevronRight, Clock, Star, MapPin, Phone,
  Search, Check, MessageSquare, Lock, ChevronLeft,
} from "lucide-react";
import { useSiteTheme } from "@/lib/themeContext";

// ── Data ──────────────────────────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  category: "cuts" | "color" | "styling" | "treatments";
  price: number;
  duration: number;
  description: string;
  image: string;
  popular?: boolean;
}

const SERVICES: Service[] = [
  { id: "s1", name: "Signature Cut & Style", category: "cuts",       price: 65,  duration: 60,  description: "Precision cut tailored to your face shape, finished with a professional blowout.", image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=400", popular: true },
  { id: "s2", name: "Balayage & Gloss",      category: "color",      price: 185, duration: 150, description: "Hand-painted highlights with a gloss treatment for natural, sun-kissed results.", image: "https://images.pexels.com/photos/7755250/pexels-photo-7755250.jpeg?auto=compress&cs=tinysrgb&w=400", popular: true },
  { id: "s3", name: "Root Touch-Up",          category: "color",      price: 75,  duration: 60,  description: "Single-process color applied to new growth for seamless, full coverage.", image: "https://images.pexels.com/photos/3993435/pexels-photo-3993435.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s4", name: "Blowout",                category: "styling",    price: 55,  duration: 45,  description: "Professional shampoo, blow-dry, and style using premium thermal products.", image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s5", name: "Keratin Smoothing",      category: "treatments", price: 220, duration: 150, description: "Eliminates frizz and tames texture for up to 4 months of silky smooth hair.", image: "https://images.pexels.com/photos/4612274/pexels-photo-4612274.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s6", name: "Highlights",             category: "color",      price: 145, duration: 120, description: "Foil highlights placed to brighten and add dimension throughout.", image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s7", name: "Bang Trim",              category: "cuts",       price: 20,  duration: 15,  description: "Quick trim to maintain shape and length between full appointments.", image: "https://images.pexels.com/photos/3992876/pexels-photo-3992876.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s8", name: "Deep Conditioning",      category: "treatments", price: 45,  duration: 30,  description: "Intensive moisture treatment that restores softness and shine to dry hair.", image: "https://images.pexels.com/photos/3993318/pexels-photo-3993318.jpeg?auto=compress&cs=tinysrgb&w=400" },
];

const STYLISTS = [
  { id: "any",    name: "Any Stylist",    title: "Next Available",          rating: null,  reviews: null,  color: "#888",    initials: "?" },
  { id: "kelly",  name: "Kelly Stanton",  title: "Master Colorist",         rating: 4.9,   reviews: 142,   color: "#B8860B", initials: "KS" },
  { id: "abbey",  name: "Abbey Krutzer",  title: "Cutting Specialist",      rating: 4.8,   reviews: 98,    color: "#3A9B8F", initials: "AK" },
  { id: "nina",   name: "Nina Torres",    title: "Balayage Artist",         rating: 5.0,   reviews: 76,    color: "#C07080", initials: "NT" },
  { id: "marcus", name: "Marcus Bell",    title: "Style & Cut Specialist",  rating: 4.8,   reviews: 54,    color: "#7B68C8", initials: "MB" },
];

// Time slots — staggered by 45 min for realism
const TIME_SLOTS = [
  "9:00 AM", "9:45 AM", "10:30 AM", "11:15 AM",
  "12:00 PM", "12:45 PM", "1:30 PM", "2:15 PM",
  "3:00 PM", "3:45 PM", "4:30 PM", "5:15 PM",
];

const CATEGORIES = [
  { id: "all",        label: "All"        },
  { id: "cuts",       label: "Cuts"       },
  { id: "color",      label: "Color"      },
  { id: "styling",    label: "Styling"    },
  { id: "treatments", label: "Treatments" },
] as const;
type CatId = typeof CATEGORIES[number]["id"];

type Step = "services" | "booking" | "checkout" | "sent";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function get7Days(from: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from); d.setDate(from.getDate() + i); return d;
  });
}

// ── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({ svc, onSelect }: { svc: Service; onSelect: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md hover:border-stone-200 transition-all"
    >
      <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden">
        {!imgErr ? (
          <img src={svc.image} alt={svc.name} loading="lazy" decoding="async" onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="w-8 h-8 text-stone-300" />
          </div>
        )}
        {svc.popular && (
          <span className="absolute top-2 left-2 gradient-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            Popular
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-sm font-semibold text-stone-800 leading-tight">{svc.name}</p>
        <p className="text-[11px] text-stone-400 mt-1 leading-relaxed line-clamp-2">{svc.description}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm font-bold text-stone-800">${svc.price}</span>
          <div className="flex items-center gap-1 text-stone-400">
            <Clock className="w-3 h-3" />
            <span className="text-[11px]">{svc.duration} min</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Compact booking widget (date + stylist + time) ────────────────────────────
function BookingWidget({
  svc,
  selectedDate, setSelectedDate,
  selectedStylistId, setSelectedStylistId,
  selectedTime, setSelectedTime,
  onBack, onContinue,
}: {
  svc: Service;
  selectedDate: Date; setSelectedDate: (d: Date) => void;
  selectedStylistId: string | null; setSelectedStylistId: (id: string) => void;
  selectedTime: string | null; setSelectedTime: (t: string) => void;
  onBack: () => void; onContinue: () => void;
}) {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(today);
  const weekDays = get7Days(weekStart);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prevWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7);
    if (d >= new Date(today.setHours(0,0,0,0))) setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  // Pseudo-availability: every other slot unavailable based on date+stylist hash
  const isSlotAvailable = (slot: string, date: Date) => {
    const h = (date.getDate() + slot.charCodeAt(0)) % 3;
    return h !== 0;
  };

  return (
    <div className="space-y-5 pt-6 animate-fade-in">
      {/* Back + service summary */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to services
      </button>

      <div className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
          <img src={svc.image} alt={svc.name} className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-stone-800 leading-tight">{svc.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">{svc.duration} min · ${svc.price}</p>
        </div>
      </div>

      {/* ── Week calendar row ── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-xs font-bold text-stone-700">
            {weekDays[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={prevWeek}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors disabled:opacity-30"
              disabled={toISO(weekDays[0]) <= toISO(today)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={nextWeek}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-1 overflow-x-auto no-scrollbar px-3 pb-3">
          {weekDays.map((day, i) => {
            const iso = toISO(day);
            const isSel = iso === toISO(selectedDate);
            const isTod = iso === toISO(today);
            const isPast = day < new Date(new Date().setHours(0,0,0,0));
            return (
              <button key={i}
                onClick={() => !isPast && setSelectedDate(new Date(day))}
                disabled={isPast}
                className={`flex-shrink-0 flex flex-col items-center w-10 py-2 rounded-xl transition-all ${
                  isSel ? "bg-stone-900 text-white" :
                  isTod ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  isPast ? "text-stone-300 cursor-not-allowed" :
                  "text-stone-600 hover:bg-stone-100"
                }`}>
                <span className="text-[10px] font-medium">{DAY_LABELS[day.getDay()]}</span>
                <span className="text-sm font-bold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stylist pills ── */}
      <div>
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2.5">Stylist</p>
        <div className="flex flex-wrap gap-2">
          {STYLISTS.map(s => {
            const isSel = selectedStylistId === s.id;
            return (
              <button key={s.id}
                onClick={() => setSelectedStylistId(s.id)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isSel
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
                style={isSel ? { background: s.id === "any" ? "#57534e" : s.color } : {}}>
                {s.id === "any" ? (
                  <span className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-[9px] font-bold">★</span>
                ) : (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: isSel ? "rgba(255,255,255,0.25)" : s.color }}>
                    {s.initials}
                  </span>
                )}
                <span>{s.id === "any" ? "Any (Next Available)" : s.name.split(" ")[0]}</span>
                {s.rating && <span className="opacity-60 text-[10px]">★{s.rating}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Time grid ── */}
      <div>
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest mb-2.5">
          Available Times &mdash; {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map(slot => {
            const avail = isSlotAvailable(slot, selectedDate);
            const isSel = selectedTime === slot;
            return (
              <button key={slot}
                onClick={() => avail && setSelectedTime(slot)}
                disabled={!avail}
                className={`py-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                  !avail ? "border-stone-100 text-stone-300 bg-stone-50 cursor-not-allowed line-through" :
                  isSel ? "border-transparent text-white shadow-sm gradient-gold" :
                  "border-stone-200 text-stone-700 bg-white hover:border-stone-300 hover:shadow-sm"
                }`}>
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinue}
        disabled={!selectedTime || !selectedStylistId}
        className="w-full py-3.5 rounded-xl bg-stone-800 text-white font-bold text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
      >
        Continue to Checkout <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Checkout screen ────────────────────────────────────────────────────────────
function CheckoutScreen({ svc, stylistName, timeSlot, phone, setPhone, onSend, onBack }: {
  svc: Service; stylistName: string; timeSlot: string; phone: string;
  setPhone: (v: string) => void; onSend: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-5 pt-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back
      </button>
      <div className="text-center pb-2">
        <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-stone-800">Secure Text-to-Pay</h2>
        <p className="text-xs text-stone-400 mt-1">We'll text a secure checkout link directly to your phone.</p>
      </div>

      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Booking Summary</p>
        {[
          ["Service", svc.name],
          ["Stylist", stylistName],
          ["Date & Time", timeSlot],
          ["Duration", `${svc.duration} min`],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
            <span className="text-xs text-stone-400">{k}</span>
            <span className="text-xs font-semibold text-stone-700">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-stone-800">Total Due</span>
          <span className="text-sm font-bold text-stone-800">${svc.price}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Your Mobile Number</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-200 bg-white focus-within:border-[hsl(38,65%,55%)]/60 transition-colors">
          <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <input type="tel" placeholder="(312) 555-0100"
            value={phone} onChange={e => setPhone(e.target.value)}
            className="flex-1 text-sm text-stone-800 focus:outline-none placeholder:text-stone-300 bg-transparent" />
        </div>
      </div>

      <button onClick={onSend} disabled={phone.replace(/\D/g, "").length < 10}
        className="w-full py-3.5 rounded-xl gradient-gold text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
        <Lock className="w-4 h-4" /> Send Secure Payment Link
      </button>
      <p className="text-[10px] text-stone-400 text-center leading-relaxed">
        Powered by Stripe · SSL encrypted · Your card is never stored by us
      </p>
    </div>
  );
}

// ── Sent screen ───────────────────────────────────────────────────────────────
function SentScreen({ phone, svc, onDone }: { phone: string; svc: Service; onDone: () => void }) {
  return (
    <div className="space-y-5 pt-6 pb-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-emerald-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-stone-800">Payment Link Sent!</h2>
        <p className="text-sm text-stone-400 mt-2 leading-relaxed">
          A secure checkout link has been sent to<br />
          <span className="text-stone-700 font-semibold">{phone}</span>
        </p>
      </div>
      <div className="mx-auto w-64 bg-stone-900 rounded-3xl p-3 shadow-2xl">
        <div className="bg-stone-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[hsl(38,65%,55%)]/20 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-4 h-4 text-[hsl(38,65%,55%)]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Loomis Salon</p>
              <p className="text-[10px] text-stone-400">just now</p>
            </div>
          </div>
          <div className="bg-[hsl(38,65%,55%)]/10 border border-[hsl(38,65%,55%)]/20 rounded-xl p-2.5">
            <p className="text-[11px] text-stone-200 leading-relaxed">
              Hi! Your {svc.name} appointment is confirmed. Tap to complete your ${svc.price} deposit:
            </p>
            <div className="mt-2 py-1.5 px-3 rounded-lg bg-[hsl(38,65%,55%)] text-white text-[10px] font-bold text-center">
              Pay ${svc.price} Securely →
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-stone-400">Completing payment reserves your spot. Link expires in 24 hours.</p>
      <button onClick={onDone} className="text-sm font-semibold text-[hsl(38,65%,55%)] hover:underline">
        Book another appointment
      </button>
    </div>
  );
}

// ── Gallery photos — public view (read-only, no edit controls) ────────────────
const GALLERY_PHOTOS = [
  "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/7755250/pexels-photo-7755250.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/4612274/pexels-photo-4612274.jpeg?auto=compress&cs=tinysrgb&w=600",
  "https://images.pexels.com/photos/3993435/pexels-photo-3993435.jpeg?auto=compress&cs=tinysrgb&w=600",
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicBooking() {
  const navigate = useNavigate();
  const { theme } = useSiteTheme();

  const [cat, setCat] = useState<CatId>("all");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("services");
  const [selectedSvc, setSelectedSvc] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>("any");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const filtered = SERVICES.filter(s => {
    const matchCat = cat === "all" || s.category === cat;
    const matchQ = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const reset = () => {
    setSelectedSvc(null); setSelectedDate(new Date());
    setSelectedStylistId("any"); setSelectedTime(null); setPhone("");
  };

  const goBack = () => {
    if (step === "booking") { setStep("services"); reset(); }
    else if (step === "checkout") setStep("booking");
    else if (step === "sent") { setStep("services"); reset(); }
  };

  const stylistObj = STYLISTS.find(s => s.id === selectedStylistId);
  const stylistDisplayName = stylistObj?.id === "any" ? "Next Available" : (stylistObj?.name ?? "");
  const timeLabel = selectedTime
    ? `${selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${selectedTime}`
    : "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, fontFamily: "'Inter',sans-serif" }}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                <Scissors className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-base font-bold text-stone-800 leading-tight">Loomis Salon</h1>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>Lincoln Park, Chicago</span>
                  <span>·</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>4.9 (316 reviews)</span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/dashboard")}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100">
              Staff Login
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-16">

        {/* ── Services grid ── */}
        {step === "services" && (
          <div className="space-y-5 pt-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  style={cat === c.id
                    ? { background: theme.pillActive, color: theme.pillActiveText, border: "1px solid transparent" }
                    : { background: "white", color: "#57534e", border: `1px solid ${theme.cardBorder}` }
                  }
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm">
                  {c.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-stone-300">
                <Scissors className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">No services match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(s => (
                  <ServiceCard key={s.id} svc={s} onSelect={() => {
                    setSelectedSvc(s);
                    setSelectedTime(null);
                    setStep("booking");
                    window.scrollTo(0, 0);
                  }} />
                ))}
              </div>
            )}

            {/* Gallery — clean static images, no edit controls */}
            {GALLERY_PHOTOS.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-bold text-stone-700">Our Work</p>
                <div className="grid grid-cols-3 gap-2">
                  {GALLERY_PHOTOS.map((src, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-stone-100">
                      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-2.5 mt-2">
              <p className="text-sm font-bold text-stone-800">Visit Us</p>
              <div className="space-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> 2450 N Lincoln Ave, Chicago, IL 60614</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> Mon–Sat 9AM–8PM · Sun Closed</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> (312) 555-0100</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Booking widget: day picker + stylist pills + time grid ── */}
        {step === "booking" && selectedSvc && (
          <BookingWidget
            svc={selectedSvc}
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            selectedStylistId={selectedStylistId} setSelectedStylistId={setSelectedStylistId}
            selectedTime={selectedTime} setSelectedTime={setSelectedTime}
            onBack={goBack}
            onContinue={() => setStep("checkout")}
          />
        )}

        {/* ── Checkout ── */}
        {step === "checkout" && selectedSvc && selectedTime && (
          <CheckoutScreen
            svc={selectedSvc} stylistName={stylistDisplayName} timeSlot={timeLabel}
            phone={phone} setPhone={setPhone}
            onSend={() => setStep("sent")}
            onBack={goBack}
          />
        )}

        {/* ── Sent ── */}
        {step === "sent" && selectedSvc && (
          <SentScreen phone={phone} svc={selectedSvc}
            onDone={() => { setStep("services"); reset(); }} />
        )}
      </main>
    </div>
  );
}
