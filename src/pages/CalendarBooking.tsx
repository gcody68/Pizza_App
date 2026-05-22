import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Clock, Search, Bell, User, Scissors, Star, Package, CreditCard, X, ChevronDown, Check, Smartphone, ArrowLeft, Zap, TriangleAlert as AlertTriangle, CalendarDays, MoveHorizontal as MoreHorizontal, Filter, TrendingUp } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AppointmentStatus = "confirmed" | "arrived" | "in-chair" | "processing" | "completed" | "no-show";

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  startHour: number; // decimal hours, e.g. 9.5 = 9:30am
  durationHours: number;
  processingMins?: number; // gap after main service for color processing
  status: AppointmentStatus;
  color: string;
  price: number;
  phone?: string;
  notes?: string;
  photo?: string;
}

interface Stylist {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  appointments: Appointment[];
}

interface InventoryAlert {
  product: string;
  current: number;
  min: number;
  unit: string;
}

interface WaitlistClient {
  name: string;
  service: string;
  waitingSince: string;
  preferredStylist?: string;
  phone: string;
}

interface RetailProduct {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 80;

const STYLISTS: Stylist[] = [
  {
    id: "kelly",
    name: "Kelly Stanton",
    initials: "KS",
    avatarColor: "#C9A84C",
    appointments: [
      { id: "a1", clientName: "Mara Collins", service: "Balayage & Cut", startHour: 9, durationHours: 2.5, processingMins: 40, status: "in-chair", color: "#e8d5b0", price: 195, notes: "Level 7 base, use Olaplex No.1 in lightener", phone: "(312) 555-0182" },
      { id: "a2", clientName: "Jessica Park", service: "Root Touch-Up", startHour: 12.5, durationHours: 1, status: "confirmed", color: "#b5cce4", price: 75, phone: "(312) 555-0199" },
      { id: "a3", clientName: "Tori Huang", service: "Keratin Smoothing", startHour: 14, durationHours: 2.5, status: "confirmed", color: "#c4e4c4", price: 220, phone: "(312) 555-0174" },
    ],
  },
  {
    id: "abbey",
    name: "Abbey Krutzer",
    initials: "AK",
    avatarColor: "#7EB8B0",
    appointments: [
      { id: "b1", clientName: "Sofia Reyes", service: "Women's Cut & Style", startHour: 8.5, durationHours: 1, status: "completed", color: "#d4c8e8", price: 75, phone: "(312) 555-0155" },
      { id: "b2", clientName: "Danielle Moore", service: "Full Color + Gloss", startHour: 10, durationHours: 2, processingMins: 35, status: "arrived", color: "#f0c8c8", price: 145, phone: "(312) 555-0163" },
      { id: "b3", clientName: "Priya Kapoor", service: "Highlights", startHour: 13, durationHours: 1.5, status: "confirmed", color: "#e8e0c4", price: 130, phone: "(312) 555-0141" },
      { id: "b4", clientName: "Lauren West", service: "Blowout", startHour: 15.5, durationHours: 0.75, status: "confirmed", color: "#c4dce4", price: 55, phone: "(312) 555-0188" },
    ],
  },
  {
    id: "nina",
    name: "Nina Torres",
    initials: "NT",
    avatarColor: "#E07B7B",
    appointments: [
      { id: "c1", clientName: "Alexis Chen", service: "Men's Cut", startHour: 9, durationHours: 0.5, status: "completed", color: "#d4e8c4", price: 45, phone: "(312) 555-0122" },
      { id: "c2", clientName: "Brooke Ellis", service: "Bang Trim + Style", startHour: 10.5, durationHours: 0.5, status: "completed", color: "#e8d4c4", price: 30, phone: "(312) 555-0133" },
      { id: "c3", clientName: "Rachel Kim", service: "Scalp Treatment", startHour: 11.5, durationHours: 0.75, status: "arrived", color: "#c8d4e8", price: 65, phone: "(312) 555-0144" },
      { id: "c4", clientName: "Hannah Scott", service: "Balayage", startHour: 13.5, durationHours: 3, processingMins: 45, status: "confirmed", color: "#e8d5b0", price: 185, phone: "(312) 555-0177" },
    ],
  },
  {
    id: "marcus",
    name: "Marcus Bell",
    initials: "MB",
    avatarColor: "#A07BD4",
    appointments: [
      { id: "d1", clientName: "Claire Nguyen", service: "Color Correction", startHour: 9.5, durationHours: 3.5, processingMins: 60, status: "in-chair", color: "#f8c8a8", price: 320, notes: "Lifting from box dye black. Pre-lightener session 1 of 2.", phone: "(312) 555-0198" },
      { id: "d2", clientName: "Olivia Hart", service: "Gloss Treatment", startHour: 14.5, durationHours: 0.75, status: "confirmed", color: "#c4e4e0", price: 55, phone: "(312) 555-0165" },
    ],
  },
];

const INVENTORY_ALERTS: InventoryAlert[] = [
  { product: "Redken 9V Violet", current: 1, min: 3, unit: "tube" },
  { product: "Olaplex No.1 Bond Multiplier", current: 0, min: 2, unit: "bottle" },
  { product: "Schwarzkopf 7-0", current: 2, min: 4, unit: "tube" },
];

const WAITLIST: WaitlistClient[] = [
  { name: "Camille Roy", service: "Balayage & Cut", waitingSince: "8:15am", preferredStylist: "Kelly Stanton", phone: "(312) 555-0101" },
  { name: "Jess Marino", service: "Root Touch-Up", waitingSince: "8:40am", phone: "(312) 555-0112" },
];

const RETAIL_PRODUCTS: RetailProduct[] = [
  { id: "r1", name: "Olaplex No.3 Hair Perfector", price: 30, selected: false },
  { id: "r2", name: "Redken All Soft Shampoo", price: 24, selected: false },
  { id: "r3", name: "Moroccanoil Treatment", price: 46, selected: false },
  { id: "r4", name: "Kevin.Murphy Smooth.Again", price: 38, selected: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  const ampm = hour >= 12 ? "pm" : "am";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return min === 0 ? `${displayHour}${ampm}` : `${displayHour}:${min.toString().padStart(2, "0")}${ampm}`;
}

function statusConfig(s: AppointmentStatus) {
  switch (s) {
    case "confirmed":   return { label: "Confirmed",   bg: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" };
    case "arrived":     return { label: "Arrived",     bg: "bg-amber-50 text-amber-700",    dot: "bg-amber-400" };
    case "in-chair":    return { label: "In Chair",    bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
    case "processing":  return { label: "Processing",  bg: "bg-sky-50 text-sky-700",        dot: "bg-sky-400" };
    case "completed":   return { label: "Completed",   bg: "bg-stone-100 text-stone-500",   dot: "bg-stone-400" };
    case "no-show":     return { label: "No Show",     bg: "bg-red-50 text-red-600",        dot: "bg-red-400" };
  }
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getWeekDates(base: Date): Date[] {
  const d = new Date(base);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    return nd;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: AppointmentStatus }) {
  const cfg = statusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AppointmentCard({
  appt,
  onClick,
}: {
  appt: Appointment;
  onClick: () => void;
}) {
  const topPx = (appt.startHour - HOUR_START) * PX_PER_HOUR;
  const heightPx = appt.durationHours * PX_PER_HOUR - 2;
  const processingHeight = appt.processingMins ? (appt.processingMins / 60) * PX_PER_HOUR : 0;
  const mainHeight = heightPx - processingHeight;
  const isCompleted = appt.status === "completed";

  return (
    <div
      className="absolute left-1 right-1 flex flex-col"
      style={{ top: topPx + 1, height: heightPx }}
    >
      {/* Main service block */}
      <button
        onClick={onClick}
        className={`flex-shrink-0 rounded-xl overflow-hidden text-left transition-all duration-200 hover:brightness-95 hover:shadow-lg active:scale-[0.99] ${isCompleted ? "opacity-60" : ""}`}
        style={{ height: mainHeight, background: appt.color, border: `1.5px solid ${appt.color}` }}
      >
        <div className="px-2 py-1.5 h-full flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-stone-800 leading-tight truncate">{appt.clientName}</p>
            {mainHeight > 45 && (
              <p className="text-[10px] text-stone-600 leading-tight mt-0.5 truncate">{appt.service}</p>
            )}
          </div>
          {mainHeight > 65 && (
            <div className="mt-auto">
              <StatusPill status={appt.status} />
            </div>
          )}
        </div>
      </button>

      {/* Processing gap */}
      {appt.processingMins && processingHeight > 0 && (
        <div
          className="flex-shrink-0 mt-0.5 rounded-lg border-2 border-dashed border-amber-300/60 bg-amber-50/40 flex items-center justify-center"
          style={{ height: processingHeight - 2 }}
        >
          <div className="flex items-center gap-1 text-amber-600/70">
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-medium">{appt.processingMins}m processing</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeGutter() {
  return (
    <div className="flex-shrink-0 w-14 relative" style={{ height: TOTAL_HOURS * PX_PER_HOUR }}>
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute right-2 flex items-center"
          style={{ top: i * PX_PER_HOUR - 8 }}
        >
          <span className="text-[10px] text-stone-400 font-medium whitespace-nowrap">
            {formatHour(HOUR_START + i)}
          </span>
        </div>
      ))}
    </div>
  );
}

function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-t border-stone-100"
          style={{ top: i * PX_PER_HOUR }}
        />
      ))}
      {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => (
        <div
          key={`half-${i}`}
          className="absolute left-0 right-0 border-t border-stone-50"
          style={{ top: (i + 0.5) * PX_PER_HOUR }}
        />
      ))}
    </div>
  );
}

function NowIndicator() {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  if (currentHour < HOUR_START || currentHour > HOUR_END) return null;
  const top = (currentHour - HOUR_START) * PX_PER_HOUR;
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="flex items-center gap-0 -mt-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0 shadow-sm" />
        <div className="flex-1 h-px bg-red-400/70" />
      </div>
    </div>
  );
}

// ── Checkout Overlay ──────────────────────────────────────────────────────────

type CheckoutStep = "summary" | "retail" | "tip" | "payment" | "done";

function CheckoutOverlay({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const [step, setStep] = useState<CheckoutStep>("summary");
  const [retail, setRetail] = useState<RetailProduct[]>(RETAIL_PRODUCTS.map(p => ({ ...p })));
  const [tipPct, setTipPct] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const retailTotal = retail.filter(p => p.selected).reduce((s, p) => s + p.price, 0);
  const tipAmount = tipPct ? appt.price * (tipPct / 100) : 0;
  const total = appt.price + retailTotal + tipAmount;

  const toggleRetail = (id: string) => setRetail(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => { setProcessing(false); setStep("done"); }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Express Checkout</p>
            <h3 className="text-lg font-bold text-stone-800 leading-tight mt-0.5">{appt.clientName}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="px-6 py-3 flex items-center gap-2">
            {(["summary","retail","tip","payment"] as CheckoutStep[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step === s ? "bg-stone-800 text-white" : i < ["summary","retail","tip","payment"].indexOf(step) ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400"}`}>
                  {i < ["summary","retail","tip","payment"].indexOf(step) ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                {i < 3 && <div className={`h-px w-4 transition-all ${i < ["summary","retail","tip","payment"].indexOf(step) ? "bg-emerald-400" : "bg-stone-200"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 pb-6">
          {/* Step: Summary */}
          {step === "summary" && (
            <div className="space-y-4">
              <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">{appt.service}</span>
                  <span className="text-sm font-semibold text-stone-800">${appt.price.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setStep("retail")} className="w-full bg-stone-800 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-stone-700 transition-colors">
                Continue to Retail Add-ons
              </button>
            </div>
          )}

          {/* Step: Retail */}
          {step === "retail" && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Recommend a product</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {retail.map(p => (
                  <button
                    key={p.id}
                    onClick={() => toggleRetail(p.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${p.selected ? "border-stone-800 bg-stone-50" : "border-stone-200 bg-white hover:border-stone-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${p.selected ? "border-stone-800 bg-stone-800" : "border-stone-300"}`}>
                        {p.selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-stone-700">{p.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-stone-800">+${p.price}</span>
                  </button>
                ))}
              </div>
              {retailTotal > 0 && (
                <p className="text-xs text-emerald-600 font-semibold text-center">+${retailTotal.toFixed(2)} retail added</p>
              )}
              <button onClick={() => setStep("tip")} className="w-full bg-stone-800 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-stone-700 transition-colors">
                Continue to Tip
              </button>
            </div>
          )}

          {/* Step: Tip */}
          {step === "tip" && (
            <div className="space-y-4">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Select tip</p>
              <div className="grid grid-cols-3 gap-2">
                {[18, 20, 25].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setTipPct(tipPct === pct ? null : pct)}
                    className={`py-4 rounded-xl border-2 transition-all ${tipPct === pct ? "border-stone-800 bg-stone-800 text-white" : "border-stone-200 text-stone-700 hover:border-stone-400"}`}
                  >
                    <p className="text-xl font-bold">{pct}%</p>
                    <p className="text-xs opacity-70 mt-0.5">${(appt.price * pct / 100).toFixed(2)}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setTipPct(null)} className="w-full text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600 transition-colors">
                No tip
              </button>
              <div className="bg-stone-50 rounded-2xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm text-stone-600"><span>Service</span><span>${appt.price.toFixed(2)}</span></div>
                {retailTotal > 0 && <div className="flex justify-between text-sm text-stone-600"><span>Retail</span><span>${retailTotal.toFixed(2)}</span></div>}
                {tipAmount > 0 && <div className="flex justify-between text-sm text-stone-600"><span>Tip ({tipPct}%)</span><span>${tipAmount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-base font-bold text-stone-800 pt-1.5 border-t border-stone-200"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
              <button onClick={() => setStep("payment")} className="w-full bg-stone-800 text-white py-3.5 rounded-2xl font-semibold text-sm hover:bg-stone-700 transition-colors">
                Proceed to Payment
              </button>
            </div>
          )}

          {/* Step: Payment */}
          {step === "payment" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-4xl font-bold text-stone-800">${total.toFixed(2)}</p>
                <p className="text-xs text-stone-400">Total due</p>
              </div>
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full relative overflow-hidden bg-stone-800 text-white py-4 rounded-2xl font-semibold text-sm hover:bg-stone-700 transition-all disabled:opacity-80 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Tap to Pay
                  </>
                )}
              </button>
              <p className="text-[10px] text-stone-400 text-center">Simulated terminal · no real charge</p>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-stone-800">Payment Complete</p>
                <p className="text-sm text-stone-400 mt-1">${total.toFixed(2)} charged · receipt sent</p>
              </div>
              <button onClick={onClose} className="w-full bg-stone-100 text-stone-700 py-3.5 rounded-2xl font-semibold text-sm hover:bg-stone-200 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Appointment Detail Drawer ─────────────────────────────────────────────────

function AppointmentDrawer({ appt, stylistName, onClose, onCheckout }: { appt: Appointment; stylistName: string; onClose: () => void; onCheckout: () => void }) {
  const statusCfg = statusConfig(appt.status);
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="px-6 pt-5 pb-2 flex items-start justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">{stylistName}</p>
            <h3 className="text-xl font-bold text-stone-800 mt-0.5">{appt.clientName}</h3>
            <p className="text-sm text-stone-500 mt-0.5">{appt.service}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <StatusPill status={appt.status} />
            <span className="text-sm text-stone-500">{formatHour(appt.startHour)} – {formatHour(appt.startHour + appt.durationHours)}</span>
            <span className="text-sm font-semibold text-stone-800 ml-auto">${appt.price.toFixed(2)}</span>
          </div>
          {appt.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><Star className="w-3 h-3" /> Formula Notes</p>
              <p className="text-xs text-amber-800 leading-relaxed">{appt.notes}</p>
            </div>
          )}
          {appt.phone && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>{appt.phone}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className="py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors">
              Reschedule
            </button>
            <button
              onClick={() => { onClose(); onCheckout(); }}
              className="py-3 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarBooking() {
  const navigate = useNavigate();
  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<{ appt: Appointment; stylistId: string } | null>(null);
  const [checkoutAppt, setCheckoutAppt] = useState<Appointment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(selectedDate);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const scrollTo = Math.max(0, (currentHour - HOUR_START - 1) * PX_PER_HOUR);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

  const selectedStylist = selectedAppt ? STYLISTS.find(s => s.id === selectedAppt.stylistId) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Navbar ── */}
      <header className="flex-shrink-0 bg-white border-b border-stone-100 px-4 lg:px-6 h-14 flex items-center gap-3 z-30">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-800">Loomis Salon</span>
          <span className="text-stone-300 text-sm">/</span>
          <span className="text-sm text-stone-500">Calendar</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-white" />
          </button>
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Booking
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 border-r border-stone-100 bg-white overflow-y-auto">

          {/* Mini calendar / week strip */}
          <div className="p-5 border-b border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-800">
                {MONTH_LABELS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 7); setSelectedDate(d); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 7); setSelectedDate(d); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-[10px] font-medium text-stone-400 text-center py-1">{d}</div>
              ))}
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === today.toDateString();
                const isSel = date.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${isSel ? "bg-stone-800 text-white" : isToday ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-stone-600 hover:bg-stone-100"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily summary */}
          <div className="p-5 border-b border-stone-100">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Today's Snapshot</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Appointments", val: "12", icon: CalendarDays, color: "text-sky-600", bg: "bg-sky-50" },
                { label: "Projected", val: "$1,840", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Completed", val: "4", icon: Check, color: "text-stone-600", bg: "bg-stone-100" },
                { label: "In Chair", val: "2", icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-xl bg-stone-50 p-3">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <p className="text-base font-bold text-stone-800">{val}</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Waitlist */}
          <div className="p-5 border-b border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Waitlist</p>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{WAITLIST.length}</span>
            </div>
            <div className="space-y-2">
              {WAITLIST.map((w, i) => (
                <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-800 truncate">{w.name}</p>
                      <p className="text-[10px] text-stone-500 truncate mt-0.5">{w.service}</p>
                      {w.preferredStylist && (
                        <p className="text-[10px] text-amber-600 mt-0.5 truncate">Prefers {w.preferredStylist}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 ml-2 flex-shrink-0">{w.waitingSince}</span>
                  </div>
                  <button className="mt-2 w-full py-1.5 rounded-lg bg-stone-800 text-white text-[10px] font-semibold hover:bg-stone-700 transition-colors flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" /> Quick Match
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory alerts */}
          <div className="p-5 border-b border-stone-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest">Inventory Alerts</p>
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="space-y-2">
              {INVENTORY_ALERTS.map((a, i) => (
                <div key={i} className={`rounded-xl p-3 flex items-start gap-2 ${a.current === 0 ? "bg-red-50 border border-red-100" : "bg-orange-50 border border-orange-100"}`}>
                  <Package className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${a.current === 0 ? "text-red-400" : "text-orange-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate ${a.current === 0 ? "text-red-700" : "text-orange-700"}`}>{a.product}</p>
                    <p className={`text-[10px] mt-0.5 ${a.current === 0 ? "text-red-500" : "text-orange-500"}`}>
                      {a.current === 0 ? "Out of stock" : `${a.current} ${a.unit}${a.current !== 1 ? "s" : ""} left`}
                    </p>
                  </div>
                  <button className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${a.current === 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                    Order
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Next client highlight */}
          {(() => {
            const now = new Date();
            const currentHour = now.getHours() + now.getMinutes() / 60;
            let nextAppt: Appointment | null = null;
            let nextStylist: Stylist | null = null;
            for (const st of STYLISTS) {
              for (const ap of st.appointments) {
                if (ap.startHour > currentHour && (nextAppt === null || ap.startHour < nextAppt.startHour)) {
                  nextAppt = ap; nextStylist = st;
                }
              }
            }
            if (!nextAppt || !nextStylist) return null;
            return (
              <div className="p-5">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Next Client Up</p>
                <div className="bg-stone-800 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: nextStylist.avatarColor + "33", color: nextStylist.avatarColor }}>
                      {nextAppt.clientName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{nextAppt.clientName}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{nextAppt.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-stone-400 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {formatHour(nextAppt.startHour)}
                    </div>
                    <div className="text-[10px] text-stone-400">with {nextStylist.name.split(" ")[0]}</div>
                  </div>
                  {nextAppt.notes && (
                    <div className="mt-3 pt-3 border-t border-stone-700">
                      <p className="text-[10px] text-stone-400 font-medium mb-1">Formula notes</p>
                      <p className="text-[10px] text-stone-300 leading-relaxed line-clamp-3">{nextAppt.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </aside>

        {/* ── Main Calendar Area ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Calendar toolbar */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
            {/* Date nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {selectedDate.toDateString() === today.toDateString() ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </button>
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day strip */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 px-2">
              {weekDates.map((date, i) => {
                const isToday = date.toDateString() === today.toDateString();
                const isSel = date.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${isSel ? "bg-stone-800 text-white" : isToday ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-stone-500 hover:bg-stone-100"}`}
                  >
                    <span className="text-[10px] font-medium">{DAY_LABELS[date.getDay()]}</span>
                    <span className="text-sm font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </button>
              <button className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <Filter className="w-3 h-3" /> Filter
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                Day <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stylist column headers */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 flex">
            <div className="flex-shrink-0 w-14" />
            {STYLISTS.map(stylist => (
              <div key={stylist.id} className="flex-1 min-w-0 px-3 py-3 border-l border-stone-100 first:border-l-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: stylist.avatarColor }}
                  >
                    {stylist.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800 truncate">{stylist.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-stone-400 truncate hidden sm:block">{stylist.appointments.length} appts</p>
                  </div>
                  <button className="ml-auto w-5 h-5 rounded-md flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors flex-shrink-0">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="flex" style={{ minHeight: TOTAL_HOURS * PX_PER_HOUR }}>
              <TimeGutter />
              {STYLISTS.map(stylist => (
                <div
                  key={stylist.id}
                  className="flex-1 min-w-0 relative border-l border-stone-100 first:border-l-0"
                  style={{ height: TOTAL_HOURS * PX_PER_HOUR }}
                >
                  <GridLines />
                  <NowIndicator />
                  {stylist.appointments.map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      onClick={() => setSelectedAppt({ appt, stylistId: stylist.id })}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* ── Right sidebar (mobile: bottom sheet trigger) ── */}
        <aside className="hidden lg:flex xl:hidden flex-col w-64 flex-shrink-0 border-l border-stone-100 bg-white overflow-y-auto">
          {/* Compact waitlist + inventory for medium screens */}
          <div className="p-4 border-b border-stone-100">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Waitlist</p>
            <div className="space-y-2">
              {WAITLIST.map((w, i) => (
                <div key={i} className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-stone-800">{w.name}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{w.service}</p>
                  <button className="mt-2 w-full py-1.5 rounded-lg bg-stone-800 text-white text-[10px] font-semibold hover:bg-stone-700 transition-colors">
                    Quick Match
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Alerts
            </p>
            <div className="space-y-2">
              {INVENTORY_ALERTS.map((a, i) => (
                <div key={i} className={`rounded-xl p-3 ${a.current === 0 ? "bg-red-50" : "bg-orange-50"}`}>
                  <p className={`text-[11px] font-semibold truncate ${a.current === 0 ? "text-red-700" : "text-orange-700"}`}>{a.product}</p>
                  <p className={`text-[10px] mt-0.5 ${a.current === 0 ? "text-red-500" : "text-orange-500"}`}>{a.current === 0 ? "Out of stock" : `${a.current} left`}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile FAB */}
      <button className="xl:hidden fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-stone-800 text-white shadow-xl flex items-center justify-center hover:bg-stone-700 transition-colors">
        <Plus className="w-5 h-5" />
      </button>

      {/* Appointment detail drawer */}
      {selectedAppt && (
        <AppointmentDrawer
          appt={selectedAppt.appt}
          stylistName={STYLISTS.find(s => s.id === selectedAppt.stylistId)?.name ?? ""}
          onClose={() => setSelectedAppt(null)}
          onCheckout={() => setCheckoutAppt(selectedAppt.appt)}
        />
      )}

      {/* Checkout overlay */}
      {checkoutAppt && (
        <CheckoutOverlay appt={checkoutAppt} onClose={() => setCheckoutAppt(null)} />
      )}
    </div>
  );
}
