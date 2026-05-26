import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Scissors, Bell, X, ArrowLeft,
  Zap, CalendarDays, UserCheck, Filter, DollarSign, Users,
  ChartBar as BarChart3, MoveHorizontal, CreditCard, Pencil, Check, ChevronDown,
} from "lucide-react";
import StaffCheckInWidget from "@/components/StaffCheckInWidget";
import { SEED_STYLISTS, type SeedStylist } from "@/lib/stylists";

// ── Types ─────────────────────────────────────────────────────────────────────
type ApptStatus = "confirmed" | "arrived" | "in-chair" | "processing" | "completed" | "no-show";

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  startHour: number;
  durationHours: number;
  status: ApptStatus;
  price: number;
  phone?: string;
  notes?: string;
  date: string;
}

interface Stylist {
  id: string;
  name: string;
  initials: string;
  color: string;
  colorLight: string;
  colorBorder: string;
  appointments: Appointment[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 80;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function getWeekDates(d: Date) {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
}
function fmtHour(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

// ── Mock appointments ─────────────────────────────────────────────────────────
const TODAY = toISO(new Date());
const TOMORROW = toISO(new Date(Date.now() + 86400000));

function buildStylists(): Stylist[] {
  return SEED_STYLISTS.map((s) => {
    const appts: Appointment[] = [];
    if (s.id === "kelly") {
      appts.push(
        { id: "k1", clientName: "Mara Collins", service: "Balayage & Cut", startHour: 9, durationHours: 2.5, status: "in-chair", price: 195, phone: "(312) 555-0182", date: TODAY },
        { id: "k2", clientName: "Jessica Park", service: "Root Touch-Up", startHour: 12.5, durationHours: 1, status: "confirmed", price: 75, date: TODAY },
        { id: "k3", clientName: "Tori Huang", service: "Keratin Smoothing", startHour: 9, durationHours: 2, status: "confirmed", price: 220, date: TOMORROW },
      );
    } else if (s.id === "abbey") {
      appts.push(
        { id: "a1", clientName: "Danielle Roe", service: "Cut & Style", startHour: 10, durationHours: 1.5, status: "arrived", price: 85, date: TODAY },
        { id: "a2", clientName: "Priya Nair", service: "Color Refresh", startHour: 13, durationHours: 2, status: "confirmed", price: 145, date: TODAY },
        { id: "a3", clientName: "Sam Lee", service: "Blowout", startHour: 10, durationHours: 1, status: "confirmed", price: 55, date: TOMORROW },
      );
    } else if (s.id === "nina") {
      appts.push(
        { id: "n1", clientName: "Chloe Martin", service: "Highlights", startHour: 9.5, durationHours: 2, status: "completed", price: 165, date: TODAY },
        { id: "n2", clientName: "Rachel Kim", service: "Gloss Treatment", startHour: 14, durationHours: 1, status: "confirmed", price: 65, date: TODAY },
      );
    } else if (s.id === "marcus") {
      appts.push(
        { id: "m1", clientName: "Devon Harris", service: "Men's Cut", startHour: 11, durationHours: 1, status: "confirmed", price: 45, date: TODAY },
        { id: "m2", clientName: "Jordan Wells", service: "Fade & Style", startHour: 14.5, durationHours: 1, status: "arrived", price: 55, date: TODAY },
        { id: "m3", clientName: "Alex Rivera", service: "Men's Cut", startHour: 10, durationHours: 1, status: "confirmed", price: 45, date: TOMORROW },
      );
    }
    return { ...s, appointments: appts };
  });
}

const STATUS_CFG: Record<ApptStatus, { label: string; bg: string; text: string; dot: string }> = {
  confirmed:  { label: "Confirmed",  bg: "bg-sky-50 border-sky-200",    text: "text-sky-700",    dot: "bg-sky-400"    },
  arrived:    { label: "Arrived",    bg: "bg-amber-50 border-amber-200", text: "text-amber-700",  dot: "bg-amber-400"  },
  "in-chair": { label: "In Chair",   bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  processing: { label: "Processing", bg: "bg-violet-50 border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  completed:  { label: "Completed",  bg: "bg-stone-50 border-stone-200", text: "text-stone-600",  dot: "bg-stone-400"  },
  "no-show":  { label: "No Show",    bg: "bg-red-50 border-red-200",     text: "text-red-700",    dot: "bg-red-400"    },
};

// ── Time gutter ───────────────────────────────────────────────────────────────
function TimeGutter() {
  return (
    <div className="flex-shrink-0 w-12" style={{ height: TOTAL_HOURS * PX_PER_HOUR }}>
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
        const h = HOUR_START + i;
        const lbl = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
        return (
          <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
            <span className="absolute -top-2 left-0 right-0 text-center text-[9px] text-stone-300 font-medium leading-none">{lbl}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Appointment block ─────────────────────────────────────────────────────────
function ApptBlock({ appt, stylist, onClick }: { appt: Appointment; stylist: Stylist; onClick: () => void }) {
  const top = (appt.startHour - HOUR_START) * PX_PER_HOUR;
  const height = Math.max(appt.durationHours * PX_PER_HOUR - 4, 28);
  return (
    <div
      onClick={onClick}
      className="absolute left-1 right-1 rounded-xl border cursor-pointer hover:shadow-md transition-all overflow-hidden"
      style={{ top, height, background: stylist.colorLight, borderColor: stylist.colorBorder }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: stylist.color }} />
      <div className="pl-2.5 pr-2 pt-1.5">
        <p className="text-[11px] font-bold truncate" style={{ color: stylist.color }}>{appt.clientName}</p>
        {height > 42 && <p className="text-[10px] text-stone-500 truncate mt-0.5">{appt.service}</p>}
        {height > 60 && <p className="text-[10px] font-semibold text-stone-400 mt-0.5">${appt.price}</p>}
      </div>
    </div>
  );
}

// ── Appointment detail side panel ─────────────────────────────────────────────
function ApptPanel({ appt, stylist, onClose, onStatusChange, onSaveNotes }: {
  appt: Appointment; stylist: Stylist; onClose: () => void;
  onStatusChange: (id: string, s: ApptStatus) => void;
  onSaveNotes: (id: string, n: string) => void;
}) {
  const sc = STATUS_CFG[appt.status];
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full sm:max-w-xs bg-white border-l border-stone-100 shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-stone-800">{appt.clientName}</p>
            <p className="text-xs text-stone-400">{stylist.name}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </div>
          <div className="bg-stone-50 rounded-xl p-3 space-y-1.5">
            {[
              ["Service", appt.service],
              ["Time", `${fmtHour(appt.startHour)} – ${fmtHour(appt.startHour + appt.durationHours)}`],
              ["Price", `$${appt.price}`],
              ...(appt.phone ? [["Phone", appt.phone]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-[11px] text-stone-400">{k}</span>
                <span className="text-[11px] font-semibold text-stone-700">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">Update Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STATUS_CFG) as ApptStatus[]).map((s) => (
                <button key={s} onClick={() => onStatusChange(appt.id, s)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${appt.status === s ? STATUS_CFG[s].bg + " " + STATUS_CFG[s].text : "border-stone-100 text-stone-500 hover:bg-stone-50"}`}>
                  {STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-amber-700">Formula Notes</p>
              <button onClick={() => editingNotes ? (onSaveNotes(appt.id, notes), setEditingNotes(false)) : setEditingNotes(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-100 px-2 py-0.5 rounded-lg">
                {editingNotes ? <><Check className="w-3 h-3" /> Save</> : <><Pencil className="w-3 h-3" /> Edit</>}
              </button>
            </div>
            {editingNotes
              ? <textarea autoFocus value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full text-xs text-amber-800 bg-white/70 border border-amber-200 rounded-lg p-2 resize-none focus:outline-none" />
              : <p className="text-xs text-amber-800 leading-relaxed min-h-[2rem]" onClick={() => setEditingNotes(true)}>{notes || <span className="text-amber-400 italic">Tap to add…</span>}</p>
            }
          </div>
          <button className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" /> Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export default function CalendarBooking() {
  const navigate = useNavigate();
  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedISO = toISO(selectedDate);
  const weekDates = getWeekDates(selectedDate);

  const [stylists, setStylists] = useState<Stylist[]>(buildStylists);
  const [selectedAppt, setSelectedAppt] = useState<{ appt: Appointment; stylistId: string } | null>(null);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);
  const [staffFocusName, setStaffFocusName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() + now.getMinutes() / 60 - HOUR_START - 1) * PX_PER_HOUR);
    }
  }, []);

  // Filter by selected date
  const filteredStylists = useMemo(() =>
    stylists.map(s => ({ ...s, appointments: s.appointments.filter(a => a.date === selectedISO) })),
    [stylists, selectedISO]
  );

  const handleStatusChange = useCallback((id: string, status: ApptStatus) => {
    setStylists(prev => prev.map(s => ({ ...s, appointments: s.appointments.map(a => a.id === id ? { ...a, status } : a) })));
    setSelectedAppt(prev => prev?.appt.id === id ? { ...prev, appt: { ...prev.appt, status } } : prev);
  }, []);

  const handleSaveNotes = useCallback((id: string, notes: string) => {
    setStylists(prev => prev.map(s => ({ ...s, appointments: s.appointments.map(a => a.id === id ? { ...a, notes } : a) })));
  }, []);

  const handleStaffAdded = useCallback((name: string, color: string) => {
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    setStylists(prev => [...prev, { id: `new-${Date.now()}`, name, initials, color, colorLight: "#faf9f7", colorBorder: "#e5e2db", appointments: [] }]);
  }, []);

  const openStaffPanel = (focusName?: string) => { setStaffFocusName(focusName ?? null); setStaffPanelOpen(true); };
  const closeStaffPanel = () => { setStaffPanelOpen(false); setStaffFocusName(null); };

  const allAppts = filteredStylists.flatMap(s => s.appointments);
  const revenue = allAppts.reduce((s, a) => s + a.price, 0);
  const completed = allAppts.filter(a => a.status === "completed").length;
  const inChair = allAppts.filter(a => a.status === "in-chair" || a.status === "processing").length;

  const currentAppt = selectedAppt
    ? (filteredStylists.find(s => s.id === selectedAppt.stylistId)?.appointments.find(a => a.id === selectedAppt.appt.id) ?? selectedAppt.appt)
    : null;
  const currentStylist = selectedAppt ? stylists.find(s => s.id === selectedAppt.stylistId) : null;

  const seedStylists: SeedStylist[] = stylists.map(s => ({ id: s.id, name: s.name, initials: s.initials, color: s.color, colorLight: s.colorLight, colorBorder: s.colorBorder }));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(35,25%,97%)", fontFamily: "'Inter',sans-serif" }}>

      {/* Navbar */}
      <header className="flex-shrink-0 bg-white border-b border-stone-100 px-4 lg:px-6 h-14 flex items-center gap-3 z-30">
        <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
            <Scissors className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-serif text-base font-semibold text-stone-800">Loomis Salon</span>
          <span className="text-stone-300 hidden sm:block">/</span>
          <span className="text-sm text-stone-500 hidden sm:block">Calendar</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400 border border-white" />
          </button>
          <button onClick={() => openStaffPanel()} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors">
            <UserCheck className="w-3.5 h-3.5" /> Team
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Booking</span>
          </button>
        </div>
      </header>

      {/* Staff panel — full-screen slide-up on mobile/tablet (<lg), right panel on lg+ */}
      {staffPanelOpen && (
        <div className="fixed inset-0 z-50 flex lg:justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={closeStaffPanel} />
          <div className="relative w-full lg:max-w-sm bg-white border-t lg:border-t-0 lg:border-l border-stone-200 shadow-2xl flex flex-col overflow-hidden mt-auto lg:mt-0 rounded-t-3xl lg:rounded-none animate-slide-in-bottom lg:animate-slide-in-right">
            <div className="lg:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[hsl(38,65%,55%)]/15 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-[hsl(38,65%,55%)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-800">Team Management</p>
                  <p className="text-[11px] text-stone-400">Schedules & availability</p>
                </div>
              </div>
              <button onClick={closeStaffPanel} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <StaffCheckInWidget
                restaurantId=""
                initialExpandName={staffFocusName}
                seedStylists={seedStylists}
                onStaffAdded={handleStaffAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Analytics bar */}
      <div className="flex-shrink-0 bg-stone-900 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
        {[
          { label: "Appts", val: allAppts.length, icon: CalendarDays, color: "text-sky-400" },
          { label: "Revenue", val: `$${revenue}`, icon: DollarSign, color: "text-emerald-400" },
          { label: "Done", val: completed, icon: Check, color: "text-stone-400" },
          { label: "In Chair", val: inChair, icon: Zap, color: "text-amber-400" },
          { label: "Stylists", val: filteredStylists.filter(s => s.appointments.length > 0).length, icon: Users, color: "text-teal-400" },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800/60 flex-shrink-0">
            <Icon className={`w-3 h-3 ${color}`} />
            <span className={`text-xs font-bold ${color}`}>{val}</span>
            <span className="text-[10px] text-stone-600">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Main calendar area ── */}
        <main className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Date navigator bar */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors whitespace-nowrap">
                {toISO(selectedDate) === toISO(today) ? "Today" : selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </button>
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week pills — clicking updates selectedDate → grid filters instantly */}
            <div className="flex-1 hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
              {weekDates.map((date, i) => {
                const isSel = toISO(date) === selectedISO;
                const isToday = toISO(date) === toISO(today);
                return (
                  <button key={i} onClick={() => setSelectedDate(new Date(date))}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                      isSel ? "bg-stone-800 text-white" :
                      isToday ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "text-stone-500 hover:bg-stone-100"
                    }`}>
                    <span className="text-[10px] font-medium">{DAY_LABELS[date.getDay()]}</span>
                    <span className="text-sm font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50">
                <Filter className="w-3 h-3" /> Filter
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50">
                Day <ChevronDown className="w-3 h-3" />
              </button>
              <button onClick={() => openStaffPanel()} className="sm:hidden w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50">
                <UserCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stylist column headers */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 flex">
            <div className="flex-shrink-0 w-12" />
            {filteredStylists.map((stylist) => (
              <div key={stylist.id} className="flex-1 min-w-0 px-3 py-3 border-l border-stone-100 first:border-l-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: stylist.color }}>
                    {stylist.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-800 truncate">{stylist.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-stone-400 hidden sm:block">{stylist.appointments.length} appts</p>
                  </div>
                  {/* ↔ opens that stylist's personal sheet */}
                  <button onClick={() => openStaffPanel(stylist.name)} title={`Manage ${stylist.name}`}
                    className="ml-auto w-5 h-5 rounded flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0">
                    <MoveHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="flex" style={{ minHeight: TOTAL_HOURS * PX_PER_HOUR }}>
              <TimeGutter />
              {filteredStylists.map((stylist) => (
                <div key={stylist.id} className="flex-1 min-w-0 relative border-l border-stone-50 first:border-l-0">
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-stone-50" style={{ top: i * PX_PER_HOUR }} />
                  ))}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={`h${i}`} className="absolute left-0 right-0 border-t border-stone-50/50 border-dashed" style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }} />
                  ))}
                  {stylist.appointments.map(appt => (
                    <ApptBlock key={appt.id} appt={appt} stylist={stylist} onClick={() => setSelectedAppt({ appt, stylistId: stylist.id })} />
                  ))}
                </div>
              ))}
            </div>
            {allAppts.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "35%" }}>
                <div className="text-center">
                  <CalendarDays className="w-10 h-10 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-300">No appointments on {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Appointment detail panel */}
      {selectedAppt && currentAppt && currentStylist && (
        <ApptPanel
          appt={currentAppt}
          stylist={currentStylist}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={handleStatusChange}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  );
}
