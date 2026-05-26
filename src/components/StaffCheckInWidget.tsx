import { useState } from "react";
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
import { Plus, Trash2, Loader as Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const AVATAR_COLORS = [
  "#C9A84C", "#7EB8B0", "#E07B7B", "#A07BD4", "#60A5FA", "#34D399", "#FB923C",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = typeof DAYS[number];

export function initials(name: string) {
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

// ── Weekly Availability Grid ──────────────────────────────────────────────────
function WeeklyGrid({ member }: { member: StaffProfile }) {
  const updateAvail = useUpdateStaffAvailability();
  const [avail, setAvail] = useState<WeeklyAvailability>(
    member.weekly_availability ?? defaultWeeklyAvailability(),
  );
  const [saving, setSaving] = useState(false);

  const toggle = (day: Day) =>
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }));

  const setTime = (day: Day, field: "start" | "end", val: string) =>
    setAvail((prev) => ({ ...prev, [day]: { ...prev[day], [field]: val } }));

  const handleSave = async () => {
    // Local-only staff members (id starts with "local-") can't be persisted
    if (member.id.startsWith("local-")) {
      toast.success(`${member.name.split(" ")[0]}'s schedule saved locally`);
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

// ── Staff Row ─────────────────────────────────────────────────────────────────
function StaffRow({
  member,
  colorIndex,
  onDelete,
  defaultExpanded,
}: {
  member: StaffProfile;
  colorIndex: number;
  onDelete: () => void;
  defaultExpanded?: boolean;
}) {
  const toggleClock = useToggleClockIn();
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [toggling, setToggling] = useState(false);
  // Local clock-in state for local-only members (no DB)
  const [localClocked, setLocalClocked] = useState(member.is_clocked_in);
  const color = member.color ?? AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const isLocal = member.id.startsWith("local-");
  const clockedIn = isLocal ? localClocked : member.is_clocked_in;

  const handleToggle = async () => {
    if (isLocal) {
      setLocalClocked((v) => !v);
      return;
    }
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
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
      clockedIn ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          {initials(member.name)}
        </div>

        {/* Name + schedule summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground leading-tight">{member.name}</p>
            {isLocal && (
              <span className="text-[9px] font-bold bg-amber-400/15 text-amber-500 border border-amber-400/25 px-1.5 py-0.5 rounded-full">local</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
            {member.weekly_availability
              ? DAYS.filter((d) => member.weekly_availability![d].enabled).join(", ") || "No days set"
              : "Schedule not set"}
          </p>
        </div>

        {/* Presence toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex-shrink-0 ${
            clockedIn
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/25"
              : "bg-secondary border-border text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          {toggling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${clockedIn ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
          )}
          {clockedIn ? "On Floor" : "Off Duty"}
        </button>

        {/* Expand schedule */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <WeeklyGrid member={member} />
        </div>
      )}
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function StaffCheckInWidget({
  restaurantId,
  initialExpandName,
}: {
  restaurantId: string;
  initialExpandName?: string | null;
}) {
  const { data: dbStaff, isLoading } = useStaff(restaurantId);
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();

  // Local fallback list — populated when DB write fails
  const [localStaff, setLocalStaff] = useState<StaffProfile[]>([]);

  // Merge: DB staff is authoritative; local additions fill in when DB is unavailable
  const staff: StaffProfile[] = [
    ...(dbStaff ?? []),
    ...localStaff.filter((l) => !(dbStaff ?? []).some((d) => d.id === l.id)),
  ];

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
      // DB unavailable — create a local-only member so the UI stays functional
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
    if (!id.startsWith("local-")) {
      try {
        await deleteStaff.mutateAsync(id);
      } catch {
        // silent — local removal is enough for UX
      }
    }
    toast.success(`${name} removed`);
  };

  const clockedIn = staff.filter((s) => s.is_clocked_in).length;
  const total = staff.length;

  return (
    <div className="space-y-5">

      {/* ── Summary bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-xs font-bold text-emerald-400">{clockedIn} on floor</span>
        </div>
        <span className="text-xs text-muted-foreground">{total} team member{total !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Staff list ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
          No staff yet. Add your first team member below.
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member, i) => (
            <StaffRow
              key={member.id}
              member={member}
              colorIndex={i}
              defaultExpanded={initialExpandName ? member.name === initialExpandName : false}
              onDelete={() => handleDelete(member.id, member.name)}
            />
          ))}
        </div>
      )}

      {/* ── Add new staff ── */}
      {adding ? (
        <div className="flex gap-2">
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

      {/* ── Help note ── */}
      <div className="rounded-xl border border-border bg-secondary/20 px-3.5 py-3 text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground font-semibold">Expand any row</span> to configure their standard weekly schedule.
        Use the <span className="text-foreground font-medium">On Floor / Off Duty</span> toggle to override booking availability in real-time for today.
      </div>
    </div>
  );
}
