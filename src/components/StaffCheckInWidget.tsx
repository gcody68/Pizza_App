import { useState, useMemo } from "react";
import {
  useStaff,
  useToggleClockIn,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaffAvailability,
  type StaffProfile,
  type WeeklyAvailability,
  type DayAvailability,
} from "@/hooks/useStaff";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader as Loader2, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const AVATAR_COLORS = [
  "#C9A84C", "#7EB8B0", "#E07B7B", "#A07BD4", "#60A5FA", "#34D399", "#FB923C",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];

export function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmt24(t: string): string {
  const [hh, mm] = t.split(":").map(Number);
  const period = hh < 12 ? "AM" : "PM";
  const h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")} ${period}`;
}

function defaultWeeklyAvailability(): WeeklyAvailability {
  const day = (enabled: boolean): DayAvailability => ({ enabled, start: "09:00", end: "17:00" });
  return { Mon: day(true), Tue: day(true), Wed: day(true), Thu: day(true), Fri: day(true), Sat: day(true), Sun: day(false) };
}

// ── Seed stylist shape passed from the calendar ───────────────────────────────
export interface SeedStylist {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

/** Convert a calendar Stylist seed into a minimal StaffProfile shape */
function seedToProfile(s: SeedStylist, index: number): StaffProfile {
  return {
    id: `seed-${s.id}`,
    restaurant_id: "",
    name: s.name,
    is_clocked_in: false,
    color: s.avatarColor,
    color_index: index,
    shift_start: null,
    shift_end: null,
    break_start: null,
    break_end: null,
    weekly_availability: null,
    created_at: "",
  };
}

// ── Weekly Availability Grid ──────────────────────────────────────────────────
function WeeklyGrid({ member }: { member: StaffProfile }) {
  const updateAvail = useUpdateStaffAvailability();
  const [avail, setAvail] = useState<WeeklyAvailability>(
    member.weekly_availability ?? defaultWeeklyAvailability(),
  );
  const [saving, setSaving] = useState(false);
  const isSeed = member.id.startsWith("seed-") || member.id.startsWith("local-");

  const toggle = (day: Day) =>
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));

  const setTime = (day: Day, field: "start" | "end", val: string) =>
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

  const handleSave = async () => {
    if (isSeed) {
      toast.success(`${member.name.split(" ")[0]}'s schedule saved`);
      return;
    }
    setSaving(true);
    try {
      await updateAvail.mutateAsync({ id: member.id, weekly_availability: avail });
      toast.success(`${member.name.split(" ")[0]}'s schedule saved`);
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Weekly Working Hours
      </p>
      <div className="space-y-1.5">
        {DAYS.map((day) => {
          const d = avail[day];
          return (
            <div
              key={day}
              className={`rounded-xl border transition-colors ${
                d.enabled ? "border-border bg-secondary/30" : "border-border/50 bg-secondary/10 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button
                  onClick={() => toggle(day)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    d.enabled ? "border-transparent bg-gold" : "border-border bg-transparent"
                  }`}
                >
                  {d.enabled && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`text-xs font-semibold w-7 flex-shrink-0 ${d.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {day}
                </span>
                {d.enabled ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="time"
                      value={d.start}
                      onChange={(e) => setTime(day, "start", e.target.value)}
                      className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-gold/60 transition-colors min-w-0"
                    />
                    <span className="text-muted-foreground text-xs flex-shrink-0">–</span>
                    <input
                      type="time"
                      value={d.end}
                      onChange={(e) => setTime(day, "end", e.target.value)}
                      className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-gold/60 transition-colors min-w-0"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic flex-1">Off</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-xl gradient-gold text-primary-foreground font-semibold text-xs transition-opacity disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Schedule"}
      </button>
    </div>
  );
}

// ── Single Stylist Sheet (focused view) ───────────────────────────────────────
function StylistSheet({
  member,
  onBack,
}: {
  member: StaffProfile;
  onBack: () => void;
}) {
  const toggleClock = useToggleClockIn();
  const [localClocked, setLocalClocked] = useState(member.is_clocked_in);
  const [toggling, setToggling] = useState(false);
  const isSeed = member.id.startsWith("seed-") || member.id.startsWith("local-");
  const clockedIn = isSeed ? localClocked : member.is_clocked_in;
  const color = member.color ?? AVATAR_COLORS[0];

  const handleToggle = async () => {
    if (isSeed) { setLocalClocked((v) => !v); return; }
    setToggling(true);
    try {
      await toggleClock.mutateAsync({ id: member.id, is_clocked_in: !member.is_clocked_in });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        All staff
      </button>

      {/* Identity card */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-sm flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {getInitials(member.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground leading-tight">{member.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {member.weekly_availability
              ? DAYS.filter((d) => member.weekly_availability![d].enabled).join(" · ") || "No days configured"
              : "Schedule not yet configured"}
          </p>
        </div>
      </div>

      {/* Presence toggle — prominent */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Status</p>
        <div className="flex gap-3">
          <button
            onClick={() => !clockedIn && handleToggle()}
            disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              clockedIn
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-emerald-400/60 hover:bg-emerald-500/5"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${clockedIn ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            On Floor
          </button>
          <button
            onClick={() => clockedIn && handleToggle()}
            disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              !clockedIn
                ? "border-stone-400 bg-stone-100/60 text-stone-600"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-stone-400/60"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!clockedIn ? "bg-stone-400" : "bg-muted-foreground/30"}`} />
            Off Duty
          </button>
        </div>
        {toggling && (
          <div className="flex items-center justify-center mt-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Weekly availability grid */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <WeeklyGrid member={member} />
      </div>
    </div>
  );
}

// ── Directory Row (general list view) ────────────────────────────────────────
function DirectoryRow({
  member,
  onSelect,
  onDelete,
}: {
  member: StaffProfile;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const toggleClock = useToggleClockIn();
  const [localClocked, setLocalClocked] = useState(member.is_clocked_in);
  const [toggling, setToggling] = useState(false);
  const isSeed = member.id.startsWith("seed-") || member.id.startsWith("local-");
  const clockedIn = isSeed ? localClocked : member.is_clocked_in;
  const color = member.color ?? AVATAR_COLORS[0];

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSeed) { setLocalClocked((v) => !v); return; }
    setToggling(true);
    try {
      await toggleClock.mutateAsync({ id: member.id, is_clocked_in: !member.is_clocked_in });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
        clockedIn ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40" : "border-border bg-card hover:border-border/80 hover:bg-secondary/30"
      }`}
      onClick={onSelect}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {getInitials(member.name)}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight truncate">{member.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
          {member.weekly_availability
            ? DAYS.filter((d) => member.weekly_availability![d].enabled).join(", ") || "No schedule"
            : "Tap to configure schedule"}
        </p>
      </div>

      {/* Status badge + toggle */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all flex-shrink-0 ${
          clockedIn
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/25"
            : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
        }`}
      >
        {toggling ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${clockedIn ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
        )}
        {clockedIn ? "On Floor" : "Off Duty"}
      </button>

      {/* Chevron hint */}
      <ChevronDown className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 -rotate-90" />

      {/* Delete (only for real/local DB entries, not seeds) */}
      {!isSeed && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function StaffCheckInWidget({
  restaurantId,
  initialExpandName,
  seedStylists = [],
}: {
  restaurantId: string;
  initialExpandName?: string | null;
  seedStylists?: SeedStylist[];
}) {
  const { data: dbStaff } = useStaff(restaurantId || null);
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();

  // Local fallback list for when DB writes fail
  const [localStaff, setLocalStaff] = useState<StaffProfile[]>([]);

  // Build the definitive staff list:
  // 1. DB staff (authoritative)
  // 2. Any local-only additions
  // 3. Seed stylists from the calendar — only shown when DB has zero results yet (avoid duplicates by name)
  const staff: StaffProfile[] = useMemo(() => {
    const dbList = dbStaff ?? [];
    const withLocal = [
      ...dbList,
      ...localStaff.filter((l) => !dbList.some((d) => d.id === l.id)),
    ];
    if (withLocal.length > 0) return withLocal;
    // DB returned nothing yet — show seeds so panel never spins blank
    return seedStylists.map((s, i) => seedToProfile(s, i));
  }, [dbStaff, localStaff, seedStylists]);

  // Focused stylist for the individual sheet view
  const [focusedName, setFocusedName] = useState<string | null>(initialExpandName ?? null);
  const focusedMember = focusedName ? staff.find((s) => s.name === focusedName) ?? null : null;

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const colorIndex = staff.length % AVATAR_COLORS.length;
    try {
      await createStaff.mutateAsync({ restaurant_id: restaurantId, name, colorIndexHint: colorIndex });
      setNewName("");
      setAdding(false);
      toast.success(`${name} added to team`);
    } catch {
      const synthetic: StaffProfile = {
        id: `local-${Date.now()}`,
        restaurant_id: restaurantId,
        name,
        is_clocked_in: false,
        color: AVATAR_COLORS[colorIndex],
        color_index: colorIndex,
        shift_start: null,
        shift_end: null,
        break_start: null,
        break_end: null,
        weekly_availability: null,
        created_at: new Date().toISOString(),
      };
      setLocalStaff((prev) => [...prev, synthetic]);
      setNewName("");
      setAdding(false);
      toast.success(`${name} added`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setLocalStaff((prev) => prev.filter((s) => s.id !== id));
    if (!id.startsWith("local-") && !id.startsWith("seed-")) {
      try { await deleteStaff.mutateAsync(id); } catch { /* silent */ }
    }
    toast.success(`${name} removed`);
  };

  const clockedInCount = staff.filter((s) => s.is_clocked_in).length;

  // ── Focused single-stylist sheet ──────────────────────────────────────────
  if (focusedMember) {
    return (
      <StylistSheet
        member={focusedMember}
        onBack={() => setFocusedName(null)}
      />
    );
  }

  // ── Directory list view ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Summary bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-xs font-bold text-emerald-400">{clockedInCount} on floor</span>
        </div>
        <span className="text-xs text-muted-foreground">{staff.length} team member{staff.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Staff directory */}
      {staff.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
          No staff yet. Add your first team member below.
        </div>
      ) : (
        <div className="space-y-2.5">
          {staff.map((member) => (
            <DirectoryRow
              key={member.id}
              member={member}
              onSelect={() => setFocusedName(member.name)}
              onDelete={() => handleDelete(member.id, member.name)}
            />
          ))}
        </div>
      )}

      {/* Add team member — always at the bottom */}
      {adding ? (
        <div className="flex gap-2 pt-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            placeholder="Full name"
            className="bg-secondary border-border flex-1 h-9 text-sm"
            autoFocus
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || creating}
            className="gradient-gold text-primary-foreground px-4 h-9 text-sm font-semibold"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => { setAdding(false); setNewName(""); }}
            className="text-muted-foreground px-3 h-9"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-2xl text-sm text-muted-foreground hover:text-gold hover:border-gold/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      )}

      <div className="rounded-xl border border-border bg-secondary/20 px-3.5 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground font-semibold">Tap any row</span> to configure their weekly schedule and override today's availability in real-time.
      </div>
    </div>
  );
}
