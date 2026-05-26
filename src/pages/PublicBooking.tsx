import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scissors, ChevronRight, Clock, Star, MapPin, Phone, Search, Check, MessageSquare, Lock } from "lucide-react";
import { useSiteTheme } from "@/lib/themeContext";

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
  { id: "s1", name: "Signature Cut & Style", category: "cuts", price: 65, duration: 60, description: "Precision cut tailored to your face shape, finished with a professional blowout.", image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=400", popular: true },
  { id: "s2", name: "Balayage & Gloss",      category: "color", price: 185, duration: 150, description: "Hand-painted highlights with a gloss treatment for natural, sun-kissed results.", image: "https://images.pexels.com/photos/7755250/pexels-photo-7755250.jpeg?auto=compress&cs=tinysrgb&w=400", popular: true },
  { id: "s3", name: "Root Touch-Up",          category: "color", price: 75, duration: 60, description: "Single-process color applied to new growth for seamless, full coverage.", image: "https://images.pexels.com/photos/3993435/pexels-photo-3993435.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s4", name: "Blowout",                category: "styling", price: 55, duration: 45, description: "Professional shampoo, blow-dry, and style using premium thermal products.", image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s5", name: "Keratin Smoothing",      category: "treatments", price: 220, duration: 150, description: "Eliminates frizz and tames texture for up to 4 months of silky smooth hair.", image: "https://images.pexels.com/photos/4612274/pexels-photo-4612274.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s6", name: "Highlights",             category: "color", price: 145, duration: 120, description: "Foil highlights placed to brighten and add dimension throughout.", image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s7", name: "Bang Trim",              category: "cuts", price: 20, duration: 15, description: "Quick trim to maintain shape and length between full appointments.", image: "https://images.pexels.com/photos/3992876/pexels-photo-3992876.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s8", name: "Deep Conditioning",      category: "treatments", price: 45, duration: 30, description: "Intensive moisture treatment that restores softness and shine to dry hair.", image: "https://images.pexels.com/photos/3993318/pexels-photo-3993318.jpeg?auto=compress&cs=tinysrgb&w=400" },
];

const STYLISTS = [
  { id: "kelly",  name: "Kelly Stanton", title: "Master Colorist",    rating: 4.9, reviews: 142, color: "#B8860B", image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "abbey",  name: "Abbey Krutzer", title: "Cutting Specialist",  rating: 4.8, reviews: 98,  color: "#3A9B8F", image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "nina",   name: "Nina Torres",   title: "Balayage Artist",     rating: 5.0, reviews: 76,  color: "#C07080", image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=200" },
  { id: "marcus", name: "Marcus Bell",   title: "Style & Cut Specialist", rating: 4.8, reviews: 54, color: "#7B68C8", image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=200" },
];

const TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"];

const CATEGORIES = [
  { id: "all",        label: "All"        },
  { id: "cuts",       label: "Cuts"       },
  { id: "color",      label: "Color"      },
  { id: "styling",    label: "Styling"    },
  { id: "treatments", label: "Treatments" },
] as const;
type CatId = typeof CATEGORIES[number]["id"];

type Step = "services" | "stylist" | "datetime" | "checkout" | "sent";

function ServiceCard({ svc, onSelect }: { svc: Service; onSelect: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button onClick={onSelect} className="group w-full text-left bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md hover:border-stone-200 transition-all">
      <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden">
        {!imgErr ? (
          <img src={svc.image} alt={svc.name} loading="lazy" decoding="async" onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Scissors className="w-8 h-8 text-stone-300" /></div>
        )}
        {svc.popular && <span className="absolute top-2 left-2 gradient-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">Popular</span>}
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

// ── Stylist card (extracted to avoid hook-in-map) ─────────────────────────────
function StylistCard({ stylist, selected, onSelect }: {
  stylist: typeof STYLISTS[number]; selected: boolean; onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:shadow-sm ${selected ? "border-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/5" : "border-stone-100 bg-white hover:border-stone-200"}`}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: stylist.color + "30" }}>
        {!imgErr
          ? <img src={stylist.image} alt={stylist.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          : <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: stylist.color }}>{stylist.name.split(" ").map(w => w[0]).join("")}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-stone-800">{stylist.name}</p>
        <p className="text-xs text-stone-400">{stylist.title}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-stone-700">{stylist.rating}</span>
          <span className="text-xs text-stone-400">({stylist.reviews})</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-stone-300" />
    </button>
  );
}

// ── Text-Link-to-Pay checkout screen ─────────────────────────────────────────
function CheckoutScreen({ svc, stylistName, timeSlot, phone, setPhone, onSend, onBack }: {
  svc: Service; stylistName: string; timeSlot: string; phone: string;
  setPhone: (v: string) => void; onSend: () => void; onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
        <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back
      </button>
      <div className="text-center pb-2">
        <div className="w-12 h-12 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-stone-800">Secure Text-to-Pay</h2>
        <p className="text-xs text-stone-400 mt-1">We'll text a secure checkout link directly to your phone.</p>
      </div>

      {/* Booking summary */}
      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 space-y-2">
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

      {/* Phone input */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1.5">Your Mobile Number</label>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-stone-200 bg-white focus-within:border-[hsl(38,65%,55%)]/60 transition-colors">
          <Phone className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <input
            type="tel" placeholder="(312) 555-0100"
            value={phone} onChange={e => setPhone(e.target.value)}
            className="flex-1 text-sm text-stone-800 focus:outline-none placeholder:text-stone-300 bg-transparent"
          />
        </div>
      </div>

      <button
        onClick={onSend}
        disabled={phone.replace(/\D/g,"").length < 10}
        className="w-full py-3.5 rounded-xl gradient-gold text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
      >
        <Lock className="w-4 h-4" /> Send Secure Payment Link
      </button>
      <p className="text-[10px] text-stone-400 text-center leading-relaxed">
        Powered by Stripe · SSL encrypted · Your card is never stored by us
      </p>
    </div>
  );
}

// ── Sent confirmation ─────────────────────────────────────────────────────────
function SentScreen({ phone, svc, onDone }: { phone: string; svc: Service; onDone: () => void }) {
  return (
    <div className="space-y-5 py-4 text-center">
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
      {/* Simulated phone mockup */}
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
      <button onClick={onDone} className="text-sm font-semibold text-[hsl(38,65%,55%)] hover:underline">Book another appointment</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicBooking() {
  const navigate = useNavigate();
  const { theme } = useSiteTheme();
  const [cat, setCat] = useState<CatId>("all");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("services");
  const [selectedSvc, setSelectedSvc] = useState<Service | null>(null);
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const filtered = SERVICES.filter(s => {
    const matchCat = cat === "all" || s.category === cat;
    const matchQ = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const goBack = () => {
    if (step === "stylist") { setStep("services"); setSelectedSvc(null); }
    else if (step === "datetime") setStep("stylist");
    else if (step === "checkout") setStep("datetime");
    else if (step === "sent") { setStep("services"); setSelectedSvc(null); setSelectedStylistId(null); setSelectedTime(null); setPhone(""); }
  };

  const stylistName = STYLISTS.find(s => s.id === selectedStylistId)?.name ?? "";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, fontFamily: "'Inter',sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-serif text-lg font-semibold text-stone-800 leading-tight">Loomis Salon</h1>
                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>Lincoln Park, Chicago</span>
                  <span>·</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>4.9 (316 reviews)</span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate("/dashboard")} className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-100">
              Staff Login
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">

        {/* ── Services ── */}
        {step === "services" && (
          <div className="space-y-5 pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors" />
            </div>

            {/* Filter pills — no duplicate bottom nav */}
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
                  <ServiceCard key={s.id} svc={s} onSelect={() => { setSelectedSvc(s); setStep("stylist"); window.scrollTo(0,0); }} />
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3 mt-6">
              <p className="text-sm font-bold text-stone-800">Visit Us</p>
              <div className="space-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> 2450 N Lincoln Ave, Chicago, IL 60614</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0" /> Mon–Sat 9AM–8PM · Sun Closed</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> (312) 555-0100</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stylist selection ── */}
        {step === "stylist" && selectedSvc && (
          <div className="space-y-5 pt-6">
            <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to services
            </button>
            <div className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                <img src={selectedSvc.image} alt={selectedSvc.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">{selectedSvc.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{selectedSvc.duration} min · ${selectedSvc.price}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-stone-700">Choose your stylist</p>
            <div className="space-y-3">
              {STYLISTS.map(stylist => (
                <StylistCard
                  key={stylist.id}
                  stylist={stylist}
                  selected={selectedStylistId === stylist.id}
                  onSelect={() => { setSelectedStylistId(stylist.id); setStep("datetime"); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Date & time ── */}
        {step === "datetime" && selectedSvc && (
          <div className="space-y-5 pt-6">
            <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back
            </button>
            <p className="text-sm font-semibold text-stone-700">Choose a time</p>
            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <p className="text-xs font-semibold text-stone-500 mb-3">Available Today</p>
              <div className="grid grid-cols-3 gap-2">
                {TIMES.map(t => (
                  <button key={t} onClick={() => setSelectedTime(t)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${selectedTime === t ? "gradient-gold text-white border-transparent shadow-sm" : "border-stone-200 text-stone-700 hover:border-stone-300 bg-stone-50"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep("checkout")}
              disabled={!selectedTime}
              className="w-full py-3.5 rounded-xl bg-stone-800 text-white font-bold text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors flex items-center justify-center gap-2">
              Continue to Checkout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Text-link-to-pay checkout ── */}
        {step === "checkout" && selectedSvc && selectedTime && (
          <div className="pt-6">
            <CheckoutScreen
              svc={selectedSvc} stylistName={stylistName} timeSlot={selectedTime}
              phone={phone} setPhone={setPhone}
              onSend={() => setStep("sent")}
              onBack={goBack}
            />
          </div>
        )}

        {/* ── Confirmation sent ── */}
        {step === "sent" && selectedSvc && (
          <div className="pt-6">
            <SentScreen phone={phone} svc={selectedSvc}
              onDone={() => { setStep("services"); setSelectedSvc(null); setSelectedStylistId(null); setSelectedTime(null); setPhone(""); }} />
          </div>
        )}
      </main>
    </div>
  );
}
