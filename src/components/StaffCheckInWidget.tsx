import { useState, useMemo } from "react";
import {
  useStaff, useToggleClockIn, useCreateStaff, useDeleteStaff,
  useUpdateStaffAvailability,
  type StaffProfile, type WeeklyAvailability, type DayAvailability,
} from "@/hooks/useStaff";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader as Loader2, ChevronLeft, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { SeedStylist } from "@/lib/stylists";

export type { SeedStylist };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function defaultAvail(): WeeklyAvailability {
  const d = (on: boolean): DayAvailability => ({ enabled: on, start: "09:00", end: "17:00" });
  return { Mon: d(true), Tue: d(true), Wed: d(true), Thu: d(true), Fri: d(true), Sat: d(true), Sun: d(false) };
}
function isFallback(id: string) { return id.startsWith("seed-") || id.startsWith("local-"); }
function seedToProfile(s: SeedStylist, i: number): StaffProfile {
  return { id: `seed-${s.id}`, restaurant_id: "", name: s.name, is_clocked_in: false, color: s.color, color_index: i, shift_start: null, shift_end: null, break_start: null, break_end: null, weekly_availability: null, created_at: "" };
}

// ── Weekly schedule grid ──────────────────────────────────────────────────────
function WeeklyGrid({ member }: { member: StaffProfile }) {
  const upd = useUpdateStaffAvailability();
  const [avail, setAvail] = useState<WeeklyAvailability>(member.weekly_availability ?? defaultAvail());
  const [saving, setSaving] = useState(false);

  const toggle = (day: Day) => setAvail(p => ({ ...p, [day]: { ...p[day], enabled: !p[day].enabled } }));
  const setT = (day: Day, f: "start" | "end", v: string) => setAvail(p => ({ ...p, [day]: { ...p[day], [f]: v } }));

  const save = async () => {
    if (isFallback(member.id)) { toast.success("Schedule saved"); return; }
    setSaving(true);
    try { await upd.mutateAsync({ id: member.id, weekly_availability: avail }); toast.success("Schedule saved"); }
    catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2.5 pt-1">
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Weekly Working Hours</p>
      <div className="space-y-1.5">
        {DAYS.map(day => {
          const d = avail[day];
          return (
            <div key={day} className={`rounded-xl border transition-colors ${d.enabled ? "border-stone-200 bg-stone-50" : "border-stone-100 bg-stone-50/40 opacity-60"}`}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button onClick={() => toggle(day)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${d.enabled ? "border-transparent bg-[hsl(38,65%,55%)]" : "border-stone-300"}`}>
                  {d.enabled && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <span className={`text-xs font-semibold w-7 flex-shrink-0 ${d.enabled ? "text-stone-700" : "text-stone-400"}`}>{day}</span>
                {d.enabled ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input type="time" value={d.start} onChange={e => setT(day, "start", e.target.value)} className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[hsl(38,65%,55%)]/60 min-w-0" />
                    <span className="text-stone-300 text-xs">–</span>
                    <input type="time" value={d.end} onChange={e => setT(day, "end", e.target.value)} className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[hsl(38,65%,55%)]/60 min-w-0" />
                  </div>
                ) : <span className="text-xs text-stone-300 italic flex-1">Off</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={save} disabled={saving} className="w-full py-2 rounded-xl gradient-gold text-white font-semibold text-xs disabled:opacity-60 flex items-center justify-center gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Schedule"}
      </button>
    </div>
  );
}

// ── Focused stylist sheet — shown when opened via ↔ or row tap ────────────────
// NOTE: This view intentionally contains NO add-staff form. Only the stylist's
// identity header, their On Floor / Off Duty toggle, and their weekly schedule.
function StylistSheet({ member, onBack }: { member: StaffProfile; onBack: () => void }) {
  const toggleClock = useToggleClockIn();
  const [localClocked, setLocalClocked] = useState(member.is_clocked_in);
  const [toggling, setToggling] = useState(false);
  const fallback = isFallback(member.id);
  const clocked = fallback ? localClocked : member.is_clocked_in;
  const color = member.color ?? "#C9A84C";

  const handleToggle = async (target: boolean) => {
    if (fallback) { setLocalClocked(target); return; }
    setToggling(true);
    try { await toggleClock.mutateAsync({ id: member.id, is_clocked_in: target }); }
    catch { toast.error("Failed to update"); }
    finally { setToggling(false); }
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> All staff
      </button>

      {/* Identity */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-white">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0" style={{ backgroundColor: color }}>
          {getInitials(member.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-stone-800 leading-tight">{member.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {member.weekly_availability
              ? DAYS.filter(d => member.weekly_availability![d].enabled).join(" · ") || "No days configured"
              : "Tap below to set schedule"}
          </p>
        </div>
      </div>

      {/* On Floor / Off Duty — two-button selector */}
      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-3">Today's Status</p>
        <div className="flex gap-3">
          <button onClick={() => !clocked && handleToggle(true)} disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${clocked ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-400 hover:border-emerald-300"}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${clocked ? "bg-emerald-500" : "bg-stone-300"}`} />
            On Floor
          </button>
          <button onClick={() => clocked && handleToggle(false)} disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${!clocked ? "border-stone-400 bg-stone-100 text-stone-700" : "border-stone-200 bg-stone-50 text-stone-400 hover:border-stone-400"}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${!clocked ? "bg-stone-500" : "bg-stone-300"}`} />
            Off Duty
          </button>
        </div>
        {toggling && <div className="flex justify-center mt-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" /></div>}
      </div>

      {/* Weekly schedule */}
      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <WeeklyGrid member={member} />
      </div>
    </div>
  );
}

// ── Directory row ─────────────────────────────────────────────────────────────
function DirectoryRow({ member, onSelect, onDelete }: { member: StaffProfile; onSelect: () => void; onDelete: () => void }) {
  const toggleClock = useToggleClockIn();
  const [localClocked, setLocalClocked] = useState(member.is_clocked_in);
  const [toggling, setToggling] = useState(false);
  const fallback = isFallback(member.id);
  const clocked = fallback ? localClocked : member.is_clocked_in;
  const color = member.color ?? "#C9A84C";

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !clocked;
    if (fallback) { setLocalClocked(next); return; }
    setToggling(true);
    try { await toggleClock.mutateAsync({ id: member.id, is_clocked_in: next }); }
    catch { toast.error("Failed to update"); }
    finally { setToggling(false); }
  };

  return (
    <div onClick={onSelect}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${clocked ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-400/40" : "border-stone-100 bg-white hover:border-stone-200"}`}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm" style={{ backgroundColor: color }}>
        {getInitials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{member.name}</p>
        <p className="text-[11px] text-stone-400 mt-0.5 truncate">
          {member.weekly_availability ? DAYS.filter(d => member.weekly_availability![d].enabled).join(", ") || "No schedule" : "Tap to configure"}
        </p>
      </div>
      <button onClick={handleToggle} disabled={toggling}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all flex-shrink-0 ${clocked ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/25" : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"}`}>
        {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className={`w-2 h-2 rounded-full ${clocked ? "bg-emerald-500" : "bg-stone-300"}`} />}
        {clocked ? "On Floor" : "Off Duty"}
      </button>
      <ChevronDown className="w-4 h-4 text-stone-200 flex-shrink-0 -rotate-90" />
      {!fallback && (
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-stone-200 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function StaffCheckInWidget({
  restaurantId,
  initialExpandName,
  seedStylists = [],
  onStaffAdded,
}: {
  restaurantId: string;
  initialExpandName?: string | null;
  seedStylists?: SeedStylist[];
  onStaffAdded?: (name: string, color: string) => void;
}) {
  const { data: dbStaff } = useStaff(restaurantId || null);
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();
  const [localStaff, setLocalStaff] = useState<StaffProfile[]>([]);

  const staff: StaffProfile[] = useMemo(() => {
    const db = dbStaff ?? [];
    const merged = [...db, ...localStaff.filter(l => !db.some(d => d.id === l.id))];
    if (merged.length > 0) return merged;
    return seedStylists.map((s, i) => seedToProfile(s, i));
  }, [dbStaff, localStaff, seedStylists]);

  const [focusedName, setFocusedName] = useState<string | null>(initialExpandName ?? null);
  const focusedMember = focusedName ? (staff.find(s => s.name === focusedName) ?? null) : null;

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const PALETTE = ["#C9A84C", "#3A9B8F", "#C07080", "#7B68C8", "#60A5FA", "#34D399", "#FB923C"];

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const colorIndex = staff.length % PALETTE.length;
    const color = PALETTE[colorIndex];
    try {
      await createStaff.mutateAsync({ restaurant_id: restaurantId, name, colorIndexHint: colorIndex });
      setNewName(""); setAdding(false);
      toast.success(`${name} added`);
      onStaffAdded?.(name, color);
    } catch {
      const synthetic: StaffProfile = { id: `local-${Date.now()}`, restaurant_id: restaurantId, name, is_clocked_in: false, color, color_index: colorIndex, shift_start: null, shift_end: null, break_start: null, break_end: null, weekly_availability: null, created_at: new Date().toISOString() };
      setLocalStaff(prev => [...prev, synthetic]);
      setNewName(""); setAdding(false);
      toast.success(`${name} added`);
      onStaffAdded?.(name, color);
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    setLocalStaff(prev => prev.filter(s => s.id !== id));
    if (!isFallback(id)) { try { await deleteStaff.mutateAsync(id); } catch { /* silent */ } }
    toast.success(`${name} removed`);
  };

  const clockedInCount = staff.filter(s => s.is_clocked_in).length;

  // Focused view — no add form here
  if (focusedMember) return <StylistSheet member={focusedMember} onBack={() => setFocusedName(null)} />;

  // Directory view
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          <span className="text-xs font-bold text-emerald-600">{clockedInCount} on floor</span>
        </div>
        <span className="text-xs text-stone-400">{staff.length} team member{staff.length !== 1 ? "s" : ""}</span>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm border border-dashed border-stone-200 rounded-2xl">
          Add your first team member below.
        </div>
      ) : (
        <div className="space-y-2.5">
          {staff.map(member => (
            <DirectoryRow key={member.id} member={member}
              onSelect={() => setFocusedName(member.name)}
              onDelete={() => handleDelete(member.id, member.name)} />
          ))}
        </div>
      )}

      {/* Add team member — only in directory view */}
      {adding ? (
        <div className="flex gap-2 pt-1">
          <Input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
            placeholder="Full name" className="flex-1 h-9 text-sm" autoFocus />
          <button onClick={handleAdd} disabled={!newName.trim() || creating}
            className="gradient-gold text-white font-semibold text-sm px-4 h-9 rounded-lg flex items-center gap-1 disabled:opacity-60">
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add"}
          </button>
          <button onClick={() => { setAdding(false); setNewName(""); }} className="px-3 h-9 rounded-lg text-stone-400 hover:bg-stone-100 text-sm">✕</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-stone-200 rounded-2xl text-sm text-stone-400 hover:text-[hsl(38,65%,55%)] hover:border-[hsl(38,65%,55%)]/40 transition-colors">
          <Plus className="w-4 h-4" /> Add Team Member
        </button>
      )}

      <p className="text-xs text-stone-400 leading-relaxed">
        <span className="text-stone-600 font-semibold">Tap any row</span> to configure schedule and toggle presence.
      </p>
    </div>
  );
}
