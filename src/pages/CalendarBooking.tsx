import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Scissors, Bell, X, ChevronDown,
  Check, ArrowLeft, Zap, CalendarDays, MoveHorizontal as MoreHorizontal,
  Filter, DollarSign, Users, ChartBar as BarChart3, UserCheck,
  CreditCard, Pencil,
} from "lucide-react";
import StaffCheckInWidget, { type SeedStylist } from "@/components/StaffCheckInWidget";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";

// ── Types ─────────────────────────────────────────────────────────────────────
type AppointmentStatus = "confirmed" | "arrived" | "in-chair" | "processing" | "completed" | "no-show";

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  startHour: number;
  durationHours: number;
  status: AppointmentStatus;
  color: string;
  price: number;
  phone?: string;
  notes?: string;
  date: string; // ISO yyyy-mm-dd
}

interface Stylist {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  appointments: Appointment[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 8;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 80;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}
function getWeekDates(d: Date) {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
}

// ── Initial mock data (keyed by date) ─────────────────────────────────────────
const TODAY = toISO(new Date());
const TOMORROW = toISO(new Date(Date.now() + 86400000));

const INITIAL_STYLISTS: Stylist[] = [
  {
    id: "kelly", name: "Kelly Stanton", initials: "KS", avatarColor: "#C9A84C",
    appointments: [
      { id: "a1", clientName: "Mara Collins", service: "Balayage & Cut", startHour: 9, durationHours: 2.5, status: "in-chair", color: "#e8d5b0", price: 195, phone: "(312) 555-0182", date: TODAY },
      { id: "a2", clientName: "Jessica Park", service: "Root Touch-Up", startHour: 12.5, durationHours: 1, status: "confirmed", color: "#b5cce4", price: 75, date: TODAY },
      { id: "a3", clientName: "Tori Huang", service: "Keratin Smoothing", startHour: 9, durationHours: 2, status: "confirmed", color: "#c4e4c4", price: 220, date: TOMORROW },
    ],
  },
  {
    id: "abbey", name: "Abbey Krutzer", initials: "AK", avatarColor: "#7EB8B0",
    appointments: [
      { id: "a4", clientName: "Danielle Roe", service: "Cut & Style", startHour: 10, durationHours: 1.5, status: "arrived", color: "#d4c4e4", price: 85, date: TODAY },
      { id: "a5", clientName: "Priya Nair", service: "Color Refresh", startHour: 13, durationHours: 2, status: "confirmed", color: "#f4d4b0", price: 145, date: TODAY },
      { id: "a6", clientName: "Sam Lee", service: "Blowout", startHour: 10, durationHours: 1, status: "confirmed", color: "#e4b0b0", price: 55, date: TOMORROW },
    ],
  },
  {
    id: "nina", name: "Nina Torres", initials: "NT", avatarColor: "#E07B7B",
    appointments: [
      { id: "a7", clientName: "Chloe Martin", service: "Highlights", startHour: 9.5, durationHours: 2, status: "completed", color: "#d0e4d0", price: 165, date: TODAY },
      { id: "a8", clientName: "Rachel Kim", service: "Gloss Treatment", startHour: 14, durationHours: 1, status: "confirmed", color: "#e4d4c4", price: 65, date: TODAY },
    ],
  },
];

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string }> = {
  confirmed: { label: "Confirmed", bg: "bg-sky-50 border-sky-200", text: "text-sky-700", dot: "bg-sky-400" },
  arrived: { label: "Arrived", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
  "in-chair": { label: "In Chair", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  processing: { label: "Processing", bg: "bg-violet-50 border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  completed: { label: "Completed", bg: "bg-stone-50 border-stone-200", text: "text-stone-600", dot: "bg-stone-400" },
  "no-show": { label: "No Show", bg: "bg-red-50 border-red-200", text: "text-red-700", dot: "bg-red-400" },
};

// ── Time gutter ───────────────────────────────────────────────────────────────
function TimeGutter() {
  return (
    <div className="flex-shrink-0 w-14" style={{ height: TOTAL_HOURS * PX_PER_HOUR }}>
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
        const h = HOUR_START + i;
        const label = h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
        return (
          <div key={h} className="relative" style={{ height: PX_PER_HOUR }}>
            <span className="absolute -top-2.5 left-0 right-0 text-center text-[10px] text-stone-300 font-medium">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Appointment block ─────────────────────────────────────────────────────────
function ApptBlock({
  appt, onClick, highlighted,
}: {
  appt: Appointment;
  onClick: () => void;
  highlighted: boolean;
}) {
  const top = (appt.startHour - HOUR_START) * PX_PER_HOUR;
  const height = Math.max(appt.durationHours * PX_PER_HOUR - 4, 28);
  const sc = STATUS_CONFIG[appt.status];
  return (
    <div
      onClick={onClick}
      className={`absolute left-1 right-1 rounded-xl border px-2 py-1.5 cursor-pointer hover:shadow-md transition-all group ${sc.bg} ${highlighted ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}
      style={{ top, height }}
    >
      <p className={`text-[11px] font-bold truncate ${sc.text}`}>{appt.clientName}</p>
      {height > 40 && <p className="text-[10px] text-stone-400 truncate">{appt.service}</p>}
      {height > 56 && <p className="text-[10px] text-stone-400">${appt.price}</p>}
    </div>
  );
}

// ── Appointment detail drawer ─────────────────────────────────────────────────
function ApptDrawer({
  appt, stylistName, onClose, onStatusChange, onSaveNotes,
}: {
  appt: Appointment;
  stylistName: string;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onSaveNotes: (id: string, notes: string) => void;
}) {
  const sc = STATUS_CONFIG[appt.status];
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex justify-end sm:items-stretch">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-full sm:max-w-xs bg-white border-l border-stone-100 shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 flex-shrink-0">
          <div>
            <p className="text-sm font-bold text-stone-800">{appt.clientName}</p>
            <p className="text-xs text-stone-400">{stylistName}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 flex-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </div>

          <div className="bg-stone-50 rounded-xl p-3 space-y-1.5">
            <Row label="Service" val={appt.service} />
            <Row label="Time" val={`${fmtHour(appt.startHour)} – ${fmtHour(appt.startHour + appt.durationHours)}`} />
            <Row label="Price" val={`$${appt.price}`} />
            {appt.phone && <Row label="Phone" val={appt.phone} />}
          </div>

          {/* Status change */}
          <div>
            <p className="text-xs font-semibold text-stone-500 mb-2">Update Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(appt.id, s)}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${appt.status === s ? STATUS_CONFIG[s].bg + " " + STATUS_CONFIG[s].text + " ring-1 ring-offset-1 ring-current" : "border-stone-100 text-stone-500 hover:bg-stone-50"}`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-amber-700">Formula Notes</p>
              <button
                onClick={() => editingNotes ? (onSaveNotes(appt.id, notes), setEditingNotes(false)) : setEditingNotes(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-100 px-2 py-0.5 rounded-lg transition-colors"
              >
                {editingNotes ? <><Check className="w-3 h-3" /> Save</> : <><Pencil className="w-3 h-3" /> Edit</>}
              </button>
            </div>
            {editingNotes ? (
              <textarea
                autoFocus value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full text-xs text-amber-800 bg-white/70 border border-amber-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            ) : (
              <p className="text-xs text-amber-800 leading-relaxed min-h-[2rem]" onClick={() => setEditingNotes(true)}>
                {notes || <span className="text-amber-400 italic">Tap to add notes…</span>}
              </p>
            )}
          </div>

          <button className="w-full py-3 rounded-xl bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" /> Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-xs font-semibold text-stone-700">{val}</span>
    </div>
  );
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh < 12 ? "AM" : "PM";
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${period}`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CalendarBooking() {
  const navigate = useNavigate();
  const { data: settings } = useRestaurantSettings();
  const restaurantId = settings?.id ?? null;

  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedISO = toISO(selectedDate);

  // Global stylist state — new staff added here immediately appear as calendar columns
  const [stylists, setStylists] = useState<Stylist[]>(INITIAL_STYLISTS);

  const [selectedAppt, setSelectedAppt] = useState<{ appt: Appointment; stylistId: string } | null>(null);
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [staffPanelFocusName, setStaffPanelFocusName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(selectedDate);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() + now.getMinutes() / 60 - HOUR_START - 1) * PX_PER_HOUR);
    }
  }, []);

  // Filter appointments to selected date only
  const filteredStylists = useMemo(() =>
    stylists.map((s) => ({
      ...s,
      appointments: s.appointments.filter((a) => a.date === selectedISO),
    })),
    [stylists, selectedISO],
  );

  const handleStatusChange = useCallback((apptId: string, status: AppointmentStatus) => {
    setStylists((prev) =>
      prev.map((s) => ({
        ...s,
        appointments: s.appointments.map((a) => a.id === apptId ? { ...a, status } : a),
      })),
    );
    setSelectedAppt((prev) =>
      prev?.appt.id === apptId ? { ...prev, appt: { ...prev.appt, status } } : prev,
    );
  }, []);

  const handleSaveNotes = useCallback((apptId: string, notes: string) => {
    setStylists((prev) =>
      prev.map((s) => ({
        ...s,
        appointments: s.appointments.map((a) => a.id === apptId ? { ...a, notes } : a),
      })),
    );
  }, []);

  // Callback so StaffCheckInWidget can push a new stylist into the calendar grid
  const handleStaffAdded = useCallback((name: string, avatarColor: string) => {
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const id = `stylist-${Date.now()}`;
    setStylists((prev) => [...prev, { id, name, initials, avatarColor, appointments: [] }]);
  }, []);

  // Seed data for widget — avoids spinner when DB lags
  const seedStylists: SeedStylist[] = stylists.map((s) => ({
    id: s.id, name: s.name, initials: s.initials, avatarColor: s.avatarColor,
  }));

  // Analytics for selected date
  const allAppts = filteredStylists.flatMap((s) => s.appointments);
  const totalAppts = allAppts.length;
  const projectedRevenue = allAppts.reduce((sum, a) => sum + a.price, 0);
  const completedCount = allAppts.filter((a) => a.status === "completed").length;
  const inChairCount = allAppts.filter((a) => a.status === "in-chair" || a.status === "processing").length;

  const currentAppt = selectedAppt
    ? filteredStylists.find((s) => s.id === selectedAppt.stylistId)?.appointments.find((a) => a.id === selectedAppt.appt.id) ?? selectedAppt.appt
    : null;

  const openPanel = (name?: string) => {
    setStaffPanelFocusName(name ?? null);
    setShowStaffPanel(true);
  };
  const closePanel = () => {
    setShowStaffPanel(false);
    setStaffPanelFocusName(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>

      {/* ── Navbar ── */}
      <header className="flex-shrink-0 bg-white border-b border-stone-100 px-4 lg:px-6 h-14 flex items-center gap-3 z-30">
        <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-800">Loomis Salon</span>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">Calendar</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 border border-white" />
          </button>
          <button
            onClick={() => openPanel()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" /> Staff
          </button>
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-semibold hover:bg-stone-700 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New Booking
          </button>
        </div>
      </header>

      {/* ── Staff panel — full-screen on mobile, right drawer on sm+ ── */}
      {showStaffPanel && (
        <div className="fixed inset-0 z-50 flex sm:justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={closePanel} />
          {/* Mobile: slide up from bottom; sm+: slide in from right */}
          <div className="relative w-full sm:max-w-sm bg-[hsl(0,0%,100%)] sm:border-l border-t sm:border-t-0 border-[hsl(30,12%,88%)] shadow-2xl flex flex-col overflow-hidden mt-auto sm:mt-0 rounded-t-3xl sm:rounded-none animate-slide-in-bottom sm:animate-slide-in-right">
            {/* Drag handle — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-stone-200" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(30,12%,88%)] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[hsl(38,65%,55%)]/15 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-[hsl(38,65%,55%)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Team Management</p>
                  <p className="text-[11px] text-stone-400">Schedules & availability</p>
                </div>
              </div>
              <button onClick={closePanel} className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <StaffCheckInWidget
                restaurantId={restaurantId ?? ""}
                initialExpandName={staffPanelFocusName}
                seedStylists={seedStylists}
                onStaffAdded={handleStaffAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics bar ── */}
      <div className="flex-shrink-0 bg-stone-900 border-b border-stone-800 px-4 py-2.5 flex items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 mr-3 flex-shrink-0">
          <BarChart3 className="w-3.5 h-3.5 text-stone-400" />
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Today</span>
        </div>
        {[
          { label: "Appts", val: totalAppts, icon: CalendarDays, color: "text-sky-400", accent: "bg-sky-400/10" },
          { label: "Revenue", val: `$${projectedRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", accent: "bg-emerald-400/10" },
          { label: "Done", val: completedCount, icon: Check, color: "text-stone-300", accent: "bg-stone-600/50" },
          { label: "In Chair", val: inChairCount, icon: Zap, color: "text-amber-400", accent: "bg-amber-400/10" },
          { label: "Stylists", val: filteredStylists.filter((s) => s.appointments.length > 0).length, icon: Users, color: "text-teal-400", accent: "bg-teal-400/10" },
        ].map(({ label, val, icon: Icon, color, accent }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${accent} flex-shrink-0`}>
            <Icon className={`w-3 h-3 ${color} flex-shrink-0`} />
            <span className={`text-sm font-bold ${color}`}>{val}</span>
            <span className="text-[10px] text-stone-500 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar (xl+) ── */}
        <aside className="hidden xl:flex flex-col w-72 flex-shrink-0 border-r border-stone-100 bg-white overflow-y-auto">
          <div className="p-5 border-b border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-800">{MONTH_LABELS[selectedDate.getMonth()]} {selectedDate.getFullYear()}</h3>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <span key={i} className="text-center text-[10px] font-bold text-stone-300">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => {
                const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                d.setDate(1 - d.getDay() + i);
                const isThisMonth = d.getMonth() === selectedDate.getMonth();
                const isSel = toISO(d) === selectedISO;
                const isToday = toISO(d) === toISO(today);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(d))}
                    className={`w-full aspect-square rounded-lg text-[11px] font-medium transition-all ${
                      isSel ? "bg-stone-800 text-white" :
                      isToday ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      isThisMonth ? "text-stone-600 hover:bg-stone-100" : "text-stone-300"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Staff on duty quick list */}
          <div className="p-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">On Floor</p>
            {stylists.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: s.avatarColor }}>
                  {s.initials}
                </div>
                <p className="text-xs font-medium text-stone-700 flex-1 truncate">{s.name}</p>
                <button onClick={() => openPanel(s.name)} className="text-[10px] text-stone-300 hover:text-stone-600 transition-colors">↔</button>
              </div>
            ))}
            <button onClick={() => openPanel()} className="mt-3 w-full text-xs text-stone-400 hover:text-[hsl(38,65%,55%)] transition-colors flex items-center gap-1.5 py-2">
              <UserCheck className="w-3.5 h-3.5" /> Manage team
            </button>
          </div>
        </aside>

        {/* ── Main calendar area ── */}
        <main className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Date navigator */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 px-4 py-3 flex items-center gap-3">
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
                {toISO(selectedDate) === toISO(today) ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </button>
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Week day pills — clicking updates selectedDate and filters grid */}
            <div className="hidden md:flex items-center gap-1 overflow-x-auto flex-1 px-2">
              {weekDates.map((date, i) => {
                const isSel = toISO(date) === selectedISO;
                const isToday = toISO(date) === toISO(today);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(new Date(date))}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                      isSel ? "bg-stone-800 text-white" :
                      isToday ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      "text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    <span className="text-[10px] font-medium">{DAY_LABELS[date.getDay()]}</span>
                    <span className="text-sm font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                <Filter className="w-3 h-3" /> Filter
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors">
                Day <ChevronDown className="w-3 h-3" />
              </button>
              {/* Mobile staff button */}
              <button onClick={() => openPanel()} className="sm:hidden w-8 h-8 rounded-lg flex items-center justify-center border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
                <UserCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stylist column headers */}
          <div className="flex-shrink-0 bg-white border-b border-stone-100 flex">
            <div className="flex-shrink-0 w-14" />
            {filteredStylists.map((stylist) => (
              <div key={stylist.id} className="flex-1 min-w-0 px-3 py-3 border-l border-stone-100 first:border-l-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: stylist.avatarColor }}
                  >
                    {stylist.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-stone-800 truncate">{stylist.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-stone-400 hidden sm:block">{stylist.appointments.length} appts</p>
                  </div>
                  {/* Double-arrow: opens that stylist's personal sheet */}
                  <button
                    onClick={() => openPanel(stylist.name)}
                    title={`Manage ${stylist.name.split(" ")[0]}'s schedule`}
                    className="ml-auto w-5 h-5 rounded-md flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors flex-shrink-0"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable appointment grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="flex" style={{ minHeight: TOTAL_HOURS * PX_PER_HOUR }}>
              <TimeGutter />
              {filteredStylists.map((stylist) => (
                <div key={stylist.id} className="flex-1 min-w-0 relative border-l border-stone-50 first:border-l-0">
                  {/* Hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-stone-50" style={{ top: i * PX_PER_HOUR }} />
                  ))}
                  {/* Half-hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-t border-stone-50/50 border-dashed" style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }} />
                  ))}
                  {/* Appointments */}
                  {stylist.appointments.map((appt) => (
                    <ApptBlock
                      key={appt.id}
                      appt={appt}
                      highlighted={false}
                      onClick={() => setSelectedAppt({ appt, stylistId: stylist.id })}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Empty state for selected date */}
          {allAppts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "30%" }}>
              <div className="text-center">
                <CalendarDays className="w-10 h-10 text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-stone-300 font-medium">No appointments on {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Appointment detail drawer ── */}
      {selectedAppt && currentAppt && (
        <ApptDrawer
          appt={currentAppt}
          stylistName={stylists.find((s) => s.id === selectedAppt.stylistId)?.name ?? ""}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={handleStatusChange}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  );
}
