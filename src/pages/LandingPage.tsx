import { useState } from "react";
import { Calendar, FileText, CreditCard, RefreshCw, Check, ArrowRight, Star } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Highlight = "calendar" | "notes" | "pos" | "sync";

/* ─── Story Highlight data ───────────────────────────────────────────────── */
const HIGHLIGHTS: { id: Highlight; label: string; icon: React.ReactNode }[] = [
  { id: "calendar",  label: "Smart Calendar", icon: <Calendar  size={22} strokeWidth={1.4} /> },
  { id: "notes",     label: "Formula Notes",  icon: <FileText  size={22} strokeWidth={1.4} /> },
  { id: "pos",       label: "Chairside POS",  icon: <CreditCard size={22} strokeWidth={1.4} /> },
  { id: "sync",      label: "Free Sync",       icon: <RefreshCw  size={22} strokeWidth={1.4} /> },
];

/* ─── Feature preview canvases ───────────────────────────────────────────── */
function CalendarCanvas() {
  const slots = [
    { time: "9:00 AM",  name: "Emma R.",    service: "Balayage",          status: "confirmed" },
    { time: "11:00 AM", name: "—",          service: "Open",              status: "open"      },
    { time: "1:00 PM",  name: "Sofia M.",   service: "Keratin Smoothing", status: "confirmed" },
    { time: "3:30 PM",  name: "Jade T.",    service: "Women's Cut",       status: "pending"   },
    { time: "5:00 PM",  name: "—",          service: "Open",              status: "open"      },
  ];
  return (
    <div className="p-8 md:p-12">
      <p className="font-serif text-xl text-[hsl(210,12%,16%)] mb-2">Today · Tuesday</p>
      <p className="text-sm text-[hsl(210,8%,44%)] mb-8 font-light">4 appointments · 2 open slots</p>
      <div className="space-y-3">
        {slots.map((s) => (
          <div key={s.time} className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all ${
            s.status === "open"
              ? "border-dashed border-[hsl(38,20%,82%)] bg-transparent opacity-60"
              : s.status === "pending"
              ? "border-[hsl(38,30%,88%)] bg-[hsl(38,30%,98%)]"
              : "border-[hsl(210,12%,90%)] bg-white shadow-sm"
          }`}>
            <span className="text-xs font-medium text-[hsl(210,8%,44%)] w-20 shrink-0">{s.time}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${s.status === "open" ? "text-[hsl(210,8%,60%)] italic" : "text-[hsl(210,12%,16%)]"}`}>{s.name}</p>
              <p className="text-xs text-[hsl(210,8%,55%)] font-light">{s.service}</p>
            </div>
            {s.status === "confirmed" && <span className="text-xs px-2.5 py-1 rounded-full bg-[hsl(145,40%,94%)] text-[hsl(145,45%,32%)] font-medium">Confirmed</span>}
            {s.status === "pending"   && <span className="text-xs px-2.5 py-1 rounded-full bg-[hsl(38,60%,94%)] text-[hsl(30,50%,38%)] font-medium">Pending</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesCanvas() {
  return (
    <div className="p-8 md:p-12">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-[hsl(38,20%,88%)] flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-[hsl(210,12%,16%)]">EK</span>
        </div>
        <div>
          <p className="font-serif text-lg text-[hsl(210,12%,16%)]">Emma K.</p>
          <p className="text-xs text-[hsl(210,8%,55%)] font-light">Client since March 2023 · Visit #14</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[hsl(210,12%,92%)] p-6 shadow-sm mb-4">
        <p className="text-xs font-semibold text-[hsl(210,8%,50%)] uppercase tracking-widest mb-3">Formula · Today</p>
        <div className="space-y-2 font-mono text-sm text-[hsl(210,12%,22%)]">
          <p><span className="text-[hsl(10,50%,55%)]">Base:</span> Redken 5N + 7N · 1:1.5 · 20vol</p>
          <p><span className="text-[hsl(200,50%,45%)]">Gloss:</span> Shades EQ 9P + 9B · 2oz · 10min</p>
          <p><span className="text-[hsl(145,40%,40%)]">Toner:</span> Wella T18 · 6vol · 8min</p>
        </div>
      </div>
      <div className="bg-[hsl(38,30%,97%)] rounded-2xl border border-dashed border-[hsl(38,20%,82%)] p-6">
        <p className="text-xs font-semibold text-[hsl(210,8%,50%)] uppercase tracking-widest mb-3">Stylist Notes</p>
        <p className="text-sm text-[hsl(210,10%,35%)] font-light leading-relaxed">
          Client prefers cooler tones at the ends. Last visit she mentioned wanting to go 1 level lighter at next appointment. Check banding at crown before applying.
        </p>
      </div>
    </div>
  );
}

function POSCanvas() {
  return (
    <div className="p-8 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-[hsl(210,12%,16%)] rounded-3xl p-8 text-white shadow-2xl mb-6">
          <p className="text-xs uppercase tracking-widest text-[hsl(210,8%,60%)] mb-6">Chairside Checkout</p>
          <p className="font-serif text-4xl mb-1">$185.00</p>
          <p className="text-xs text-[hsl(210,8%,55%)] font-light mb-8">Balayage + Toner + Blowout</p>
          <div className="space-y-2 mb-8">
            {["Balayage — $120", "Toner — $25", "Blowout — $40"].map(item => (
              <div key={item} className="flex justify-between text-xs text-[hsl(210,8%,70%)]">
                <span className="font-light">{item.split(" — ")[0]}</span>
                <span>{item.split(" — ")[1]}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-[hsl(145,40%,45%)] flex items-center justify-center mx-auto mb-3">
              <Check size={22} className="text-white" />
            </div>
            <p className="text-sm font-medium">Payment Successful</p>
            <p className="text-xs text-[hsl(210,8%,60%)] font-light mt-1">Tap to Pay · Visa ···4821</p>
          </div>
        </div>
        <p className="text-center text-xs text-[hsl(210,8%,55%)] font-light">
          Powered by Stripe · No terminal required
        </p>
      </div>
    </div>
  );
}

function SyncCanvas() {
  const events = [
    { platform: "Google Calendar", action: "Appointment synced", time: "just now",  color: "hsl(200,70%,50%)" },
    { platform: "Loomis Scheduler", action: "Slot blocked: 3:30 PM", time: "just now",  color: "hsl(210,12%,16%)" },
    { platform: "Client Reminder", action: "SMS sent to Emma R.", time: "2 min ago", color: "hsl(145,40%,42%)" },
    { platform: "Google Calendar", action: "Tomorrow synced",     time: "5 min ago", color: "hsl(200,70%,50%)" },
  ];
  return (
    <div className="p-8 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-full bg-[hsl(200,70%,92%)] flex items-center justify-center">
          <RefreshCw size={14} className="text-[hsl(200,70%,40%)]" />
        </div>
        <div>
          <p className="font-serif text-lg text-[hsl(210,12%,16%)]">Live Sync Feed</p>
          <p className="text-xs text-[hsl(210,8%,55%)] font-light">Google Calendar · Always free</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-[hsl(145,45%,38%)] font-medium">
          <span className="w-2 h-2 rounded-full bg-[hsl(145,45%,42%)] animate-pulse" />
          Live
        </span>
      </div>
      <div className="space-y-3">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[hsl(210,12%,92%)] shadow-sm">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[hsl(210,12%,20%)]">{e.platform}</p>
              <p className="text-xs text-[hsl(210,8%,50%)] font-light">{e.action}</p>
            </div>
            <span className="text-xs text-[hsl(210,8%,60%)] shrink-0">{e.time}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-[hsl(210,8%,55%)] font-light mt-6">
        Native Google Calendar sync — included at no extra cost
      </p>
    </div>
  );
}

/* ─── Grid overlay micro-components ─────────────────────────────────────── */
function FormulaOverlay() {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/60">
      <p className="text-[10px] font-semibold text-[hsl(210,8%,45%)] uppercase tracking-widest mb-1">Formula · Sofia M.</p>
      <p className="font-mono text-xs text-[hsl(210,12%,18%)] leading-relaxed">
        Redken 5N + 7N · 1:1.5 · 20vol<br/>
        <span className="text-[hsl(200,50%,45%)]">Gloss:</span> 9P · 10min
      </p>
    </div>
  );
}

function PaymentOverlay() {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-[hsl(210,12%,14%)]/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/10">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[hsl(145,40%,42%)] flex items-center justify-center shrink-0">
          <Check size={13} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white">$185.00 · Payment Successful</p>
          <p className="text-[10px] text-[hsl(210,8%,60%)] font-light">Tap to Pay · Visa ···4821</p>
        </div>
      </div>
    </div>
  );
}

function CalendarOverlay() {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-white/92 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/60">
      <p className="text-[10px] font-semibold text-[hsl(210,8%,45%)] uppercase tracking-widest mb-1.5">Gap Filled</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[hsl(145,40%,42%)] shrink-0" />
        <p className="text-xs text-[hsl(210,12%,18%)] font-medium">3:30 PM · Jade T. · Root Touch-Up</p>
      </div>
    </div>
  );
}

/* ─── Main LandingPage ──────────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeHighlight, setActiveHighlight] = useState<Highlight>("calendar");

  const canvases: Record<Highlight, React.ReactNode> = {
    calendar: <CalendarCanvas />,
    notes:    <NotesCanvas />,
    pos:      <POSCanvas />,
    sync:     <SyncCanvas />,
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(38,30%,96%)", color: "hsl(210,12%,16%)" }}>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "hsl(38,30%,96%)/95", backdropFilter: "blur(12px)", borderColor: "hsl(38,20%,88%)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-lg font-medium tracking-wide" style={{ color: "hsl(210,12%,16%)" }}>
            Loomis
          </span>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Pricing", "For Salons"].map(item => (
              <a key={item} href="#" className="text-sm font-light transition-opacity hover:opacity-60" style={{ color: "hsl(210,10%,35%)" }}>
                {item}
              </a>
            ))}
          </div>
          <a href="/dashboard" className="text-sm font-medium px-5 py-2 rounded-full transition-all hover:opacity-80 active:scale-95" style={{ background: "hsl(210,12%,16%)", color: "hsl(38,30%,96%)" }}>
            Try Live Demo
          </a>
        </div>
      </nav>

      {/* ── Split Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-16 items-center">
        {/* Left: Typography */}
        <div className="animate-fade-up">
          <span className="inline-block text-xs font-medium uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-8 border" style={{ color: "hsl(30,50%,45%)", borderColor: "hsl(38,30%,82%)", background: "hsl(38,40%,93%)" }}>
            The Aesthetic Operating System
          </span>
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 tracking-tight" style={{ color: "hsl(210,12%,12%)" }}>
            Loomis&nbsp;Salon.<br />
            <em className="not-italic" style={{ color: "hsl(30,45%,42%)" }}>For Premium</em><br />
            Salons.
          </h1>
          <p className="text-base font-light leading-relaxed mb-10 max-w-md" style={{ color: "hsl(210,10%,38%)", fontFamily: "'Inter', sans-serif" }}>
            A beautifully minimal platform built for the way stylists actually work — not the way enterprise software thinks they should.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <a href="/dashboard" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95" style={{ background: "hsl(210,12%,14%)", color: "hsl(38,30%,96%)" }}>
              Get Started Free
              <ArrowRight size={15} />
            </a>
            <a href="#features" className="text-sm font-light transition-opacity hover:opacity-60 flex items-center gap-1.5" style={{ color: "hsl(210,10%,45%)" }}>
              See how it works
            </a>
          </div>
          <div className="mt-12 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["E","S","J","A"].map((l, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold" style={{ borderColor: "hsl(38,30%,96%)", background: `hsl(${30 + i * 15},${30 + i * 5}%,${82 - i * 5}%)`, color: "hsl(210,12%,22%)" }}>
                  {l}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 mb-0.5">
                {[...Array(5)].map((_,i) => <Star key={i} size={11} fill="hsl(38,70%,52%)" className="text-transparent" />)}
              </div>
              <p className="text-xs font-light" style={{ color: "hsl(210,8%,50%)" }}>Loved by 200+ stylists</p>
            </div>
          </div>
        </div>

        {/* Right: Salon photo */}
        <div className="animate-fade-up-delay-1 relative">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl aspect-[4/5]">
            <img
              src="https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Header_Image.png"
              alt="Loomis Salon — premium boutique interior"
              className="w-full h-full object-cover"
            />
            {/* Floating stat card */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/60">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "hsl(210,8%,50%)" }}>This Week</p>
              <p className="font-serif text-2xl" style={{ color: "hsl(210,12%,16%)" }}>94%</p>
              <p className="text-[11px] font-light" style={{ color: "hsl(210,8%,55%)" }}>Chair occupancy</p>
            </div>
            {/* Floating badge */}
            <div className="absolute bottom-6 left-6 bg-[hsl(210,12%,14%)]/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/10 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[hsl(145,40%,48%)] animate-pulse shrink-0" />
              <p className="text-xs font-medium text-white">3 stylists synced · live</p>
            </div>
          </div>
          {/* Decorative blur blobs */}
          <div className="absolute -top-8 -left-8 w-48 h-48 rounded-full blur-3xl -z-10" style={{ background: "hsl(38,60%,88%)", opacity: 0.6 }} />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full blur-3xl -z-10" style={{ background: "hsl(200,30%,88%)", opacity: 0.5 }} />
        </div>
      </section>

      {/* ── Story Highlights Row ───────────────────────────────────────── */}
      <section id="features" className="border-t border-b py-16" style={{ borderColor: "hsl(38,20%,88%)", background: "hsl(38,25%,98%)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] mb-10" style={{ color: "hsl(210,8%,55%)" }}>
            Everything your salon needs
          </p>

          {/* Highlight circles */}
          <div className="flex justify-center gap-8 md:gap-12 mb-10 overflow-x-auto pb-2">
            {HIGHLIGHTS.map(h => (
              <button
                key={h.id}
                onClick={() => setActiveHighlight(h.id)}
                className="flex flex-col items-center gap-2.5 shrink-0 group"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  activeHighlight === h.id
                    ? "shadow-lg scale-105"
                    : "hover:scale-105 hover:shadow-md"
                }`} style={{
                  borderColor: activeHighlight === h.id ? "hsl(210,12%,16%)" : "hsl(38,20%,82%)",
                  background: activeHighlight === h.id ? "hsl(210,12%,16%)" : "white",
                  color: activeHighlight === h.id ? "hsl(38,30%,96%)" : "hsl(210,12%,35%)",
                }}>
                  {h.icon}
                </div>
                <span className="text-xs font-medium text-center" style={{ color: activeHighlight === h.id ? "hsl(210,12%,16%)" : "hsl(210,8%,50%)" }}>
                  {h.label}
                </span>
              </button>
            ))}
          </div>

          {/* Feature preview canvas */}
          <div className="max-w-3xl mx-auto rounded-3xl border overflow-hidden shadow-xl transition-all duration-300" style={{ borderColor: "hsl(38,20%,88%)", background: "hsl(38,30%,97%)" }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: "hsl(38,20%,90%)", background: "hsl(38,25%,99%)" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0,60%,75%)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(40,70%,70%)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(145,50%,65%)" }} />
              <span className="ml-3 text-xs font-light" style={{ color: "hsl(210,8%,55%)" }}>
                Loomis · {HIGHLIGHTS.find(h => h.id === activeHighlight)?.label}
              </span>
            </div>
            <div className="min-h-[340px]">
              {canvases[activeHighlight]}
            </div>
          </div>
        </div>
      </section>

      {/* ── Visual Studio 3-Column Grid ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl md:text-5xl mb-4" style={{ color: "hsl(210,12%,14%)" }}>
            Built for the chair,<br />not the desk.
          </h2>
          <p className="text-base font-light max-w-lg mx-auto" style={{ color: "hsl(210,10%,42%)", fontFamily: "'Inter', sans-serif" }}>
            Every tool is designed around how a stylist moves — fast, intuitive, beautiful.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 — Formula Notes */}
          <div className="grid-card relative overflow-hidden rounded-3xl aspect-[3/4] cursor-default shadow-md">
            <img
              src="https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Highlights_Balayage.png"
              alt="Formula notes"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(30,30,30,0.55) 0%, transparent 55%)" }} />
            <div className="absolute top-4 left-4 right-4 bg-white/88 backdrop-blur-md rounded-2xl px-4 py-3 shadow-md border border-white/50">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "hsl(210,8%,45%)" }}>Formula · Sofia M.</p>
              <p className="font-mono text-xs leading-relaxed" style={{ color: "hsl(210,12%,16%)" }}>
                Redken 5N + 7N · 1:1.5<br/>
                <span style={{ color: "hsl(200,50%,45%)" }}>Gloss:</span> 9P · 10min
              </p>
            </div>
            <div className="absolute bottom-5 left-5">
              <p className="font-serif text-lg font-medium text-white">Formula Notes</p>
              <p className="text-xs font-light text-white/70">Never lose a formula again</p>
            </div>
          </div>

          {/* Card 2 — Chairside POS (tall) */}
          <div className="grid-card relative overflow-hidden rounded-3xl md:row-span-1 aspect-[3/4] cursor-default shadow-md" style={{ aspectRatio: "3/4" }}>
            <img
              src="https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Keratin_Smoothing.png"
              alt="Chairside POS"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,20,20,0.65) 0%, transparent 50%)" }} />
            <PaymentOverlay />
            <div className="absolute top-5 left-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}>
                Chairside POS
              </span>
            </div>
          </div>

          {/* Card 3 — Calendar */}
          <div className="grid-card relative overflow-hidden rounded-3xl aspect-[3/4] cursor-default shadow-md">
            <img
              src="https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Women's_Haircut_%26_Style.png"
              alt="Smart calendar"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(25,25,25,0.6) 0%, transparent 55%)" }} />
            <CalendarOverlay />
            <div className="absolute top-5 left-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "white", border: "1px solid rgba(255,255,255,0.25)" }}>
                Smart Calendar
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Card ──────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: "hsl(210,12%,14%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-8 border" style={{ color: "hsl(38,50%,72%)", borderColor: "hsl(38,30%,35%)", background: "hsl(38,20%,20%)" }}>
            Anti-Vagaro Pricing
          </span>
          <h2 className="font-serif text-4xl md:text-5xl mb-4" style={{ color: "hsl(38,30%,96%)" }}>
            One Flat Rate.<br />
            <em style={{ color: "hsl(38,50%,68%)" }}>Unlimited Stylist Syncs.</em>
          </h2>
          <p className="text-base font-light mb-14 leading-relaxed" style={{ color: "hsl(210,8%,60%)", fontFamily: "'Inter', sans-serif" }}>
            No per-seat charges. No paywall on calendar sync. No feature-gating your own client data.
          </p>

          {/* Pricing block */}
          <div className="rounded-3xl border p-10 mb-8" style={{ borderColor: "hsl(210,10%,26%)", background: "hsl(210,12%,18%)" }}>
            <div className="flex items-end justify-center gap-1.5 mb-2">
              <span className="font-serif text-6xl font-medium" style={{ color: "hsl(38,30%,96%)" }}>$49</span>
              <span className="text-base font-light mb-3" style={{ color: "hsl(210,8%,55%)" }}>/mo</span>
            </div>
            <p className="text-sm font-light mb-10" style={{ color: "hsl(210,8%,55%)" }}>Per salon. Every stylist. Every seat.</p>

            <ul className="space-y-4 text-left mb-10">
              {[
                { text: "Google Calendar sync — free, always", highlight: true },
                { text: "Unlimited stylists on one account" },
                { text: "Chairside Stripe POS" },
                { text: "Client formula notes & history" },
                { text: "Smart gap-filling calendar" },
                { text: "SMS appointment reminders" },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: item.highlight ? "hsl(38,50%,50%)" : "hsl(210,10%,28%)" }}>
                    <Check size={11} className="text-white" />
                  </div>
                  <span className={`text-sm font-light ${item.highlight ? "font-medium" : ""}`} style={{ color: item.highlight ? "hsl(38,50%,80%)" : "hsl(210,8%,72%)" }}>
                    {item.text}
                    {item.highlight && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: "hsl(38,50%,30%)", color: "hsl(38,60%,80%)" }}>
                        Included
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <a href="/dashboard" className="block w-full py-4 rounded-full text-center text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-98" style={{ background: "hsl(38,30%,96%)", color: "hsl(210,12%,14%)" }}>
              Start Free — No Credit Card
            </a>
          </div>

          <p className="text-xs font-light" style={{ color: "hsl(210,8%,45%)" }}>
            Compare to Vagaro ($90+/mo), Mindbody ($139+/mo), or Boulevard ($175+/mo).<br />
            We charge one flat rate. Competitors charge per seat and gate calendar sync behind premium tiers.
          </p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t" style={{ background: "hsl(38,25%,97%)", borderColor: "hsl(38,20%,88%)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-serif text-base font-medium" style={{ color: "hsl(210,12%,25%)" }}>Loomis</span>
          <p className="text-xs font-light text-center" style={{ color: "hsl(210,8%,55%)" }}>
            The aesthetic operating system for premium salons.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" className="text-xs font-light transition-opacity hover:opacity-60" style={{ color: "hsl(210,8%,50%)" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}


export default LandingPage