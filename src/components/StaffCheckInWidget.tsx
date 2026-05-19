import { useState } from "react";
import {
  useStaff,
  useToggleClockIn,
  useCreateStaff,
  useDeleteStaff,
  useUpdateStaffSchedule,
  type StaffProfile,
} from "@/hooks/useStaff";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserCheck, Plus, Trash2, Loader as Loader2, ChevronDown, ChevronUp, Clock, Coffee } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C", "#38BDF8",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

/** Format a 24h "HH:MM" time string into a display string like "9:00 AM" */
function fmt24(t: string | null): string {
  if (!t) return "—";
  const [hh, mm] = t.split(":").map(Number);
  const period = hh < 12 ? "AM" : "PM";
  const h = hh % 12 || 12;
  return `${h}:${String(mm).padStart(2, "0")} ${period}`;
}

// ── Shift Settings Panel ──────────────────────────────────────────────────────
function ShiftSettingsPanel({ member }: { member: StaffProfile }) {
  const updateSchedule = useUpdateStaffSchedule();

  const [shiftEnabled, setShiftEnabled] = useState(
    !!(member.shift_start || member.shift_end),
  );
  const [breakEnabled, setBreakEnabled] = useState(
    !!(member.break_start || member.break_end),
  );

  const [shiftStart, setShiftStart] = useState(member.shift_start ?? "09:00");
  const [shiftEnd,   setShiftEnd]   = useState(member.shift_end   ?? "18:00");
  const [breakStart, setBreakStart] = useState(member.break_start ?? "12:00");
  const [breakEnd,   setBreakEnd]   = useState(member.break_end   ?? "13:00");

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSchedule.mutateAsync({
        id: member.id,
        shift_start: shiftEnabled ? shiftStart : null,
        shift_end:   shiftEnabled ? shiftEnd   : null,
        break_start: breakEnabled ? breakStart : null,
        break_end:   breakEnabled ? breakEnd   : null,
      });
      toast.success(`${member.name}'s schedule saved`);
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-4 pl-12 pr-2">

      {/* Shift window */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gold" />
            <p className="text-sm font-semibold text-foreground">Shift Hours</p>
          </div>
          <Switch
            checked={shiftEnabled}
            onCheckedChange={(v) => setShiftEnabled(v)}
          />
        </div>
        {shiftEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Shift Start
              </Label>
              <Input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="bg-secondary border-border text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Shift End
              </Label>
              <Input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="bg-secondary border-border text-sm h-9"
              />
            </div>
          </div>
        )}
        {!shiftEnabled && (
          <p className="text-xs text-muted-foreground">
            No shift window set — all day slots (9 AM–7 PM) are available.
          </p>
        )}
      </div>

      {/* Lunch / break */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-3.5 h-3.5 text-gold" />
            <p className="text-sm font-semibold text-foreground">Lunch / Break</p>
          </div>
          <Switch
            checked={breakEnabled}
            onCheckedChange={(v) => setBreakEnabled(v)}
          />
        </div>
        {breakEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Break Start
              </Label>
              <Input
                type="time"
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
                className="bg-secondary border-border text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Break End
              </Label>
              <Input
                type="time"
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
                className="bg-secondary border-border text-sm h-9"
              />
            </div>
          </div>
        )}
        {breakEnabled && (
          <p className="text-xs text-muted-foreground">
            Slots overlapping this window will be removed from the booking calendar.
          </p>
        )}
        {!breakEnabled && (
          <p className="text-xs text-muted-foreground">
            No break defined — bookings can be made throughout the shift.
          </p>
        )}
      </div>

      {/* Current schedule summary */}
      {(member.shift_start || member.break_start) && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          {member.shift_start && (
            <span className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" />
              {fmt24(member.shift_start)} – {fmt24(member.shift_end)}
            </span>
          )}
          {member.break_start && (
            <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Coffee className="w-2.5 h-2.5" />
              Break {fmt24(member.break_start)} – {fmt24(member.break_end)}
            </span>
          )}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gradient-gold text-primary-foreground font-semibold h-9 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Schedule"}
      </Button>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────────────────────
export default function StaffCheckInWidget({ restaurantId }: { restaurantId: string }) {
  const { data: staff, isLoading } = useStaff(restaurantId);
  const toggleClock  = useToggleClockIn();
  const createStaff  = useCreateStaff();
  const deleteStaff  = useDeleteStaff();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName]       = useState("");
  const [adding, setAdding]         = useState(false);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleClock.mutateAsync({ id, is_clocked_in: !current });
    } catch {
      toast.error("Failed to update clock-in status");
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createStaff.mutateAsync({ restaurant_id: restaurantId, name });
      setNewName("");
      setAdding(false);
      toast.success(`${name} added to staff`);
    } catch {
      toast.error("Failed to add staff member");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteStaff.mutateAsync(id);
      if (expandedId === id) setExpandedId(null);
      toast.success(`${name} removed`);
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  const clockedIn = (staff ?? []).filter((s) => s.is_clocked_in).length;
  const total     = (staff ?? []).length;

  return (
    <div className="space-y-4">
      {/* Summary pill */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-400">{clockedIn} clocked in</span>
        </div>
        <span className="text-xs text-muted-foreground">{total} staff total</span>
      </div>

      {/* Staff list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          No staff yet. Add your first team member below.
        </div>
      ) : (
        <div className="space-y-2">
          {(staff ?? []).map((member, i) => {
            const color    = member.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
            const expanded = expandedId === member.id;

            return (
              <div
                key={member.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  member.is_clocked_in
                    ? "border-green-500/25 bg-green-500/5"
                    : "border-border bg-secondary/20"
                }`}
              >
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {initials(member.name)}
                  </div>

                  {/* Name + schedule summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{member.name}</p>
                    <p className={`text-xs leading-tight ${member.is_clocked_in ? "text-green-400" : "text-muted-foreground"}`}>
                      {member.is_clocked_in ? "Clocked In" : "Clocked Out"}
                      {member.shift_start && (
                        <span className="text-muted-foreground ml-1.5">
                          · {fmt24(member.shift_start)}–{fmt24(member.shift_end)}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Expand shift settings */}
                  <button
                    onClick={() => setExpandedId(expanded ? null : member.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
                    title="Shift settings"
                  >
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Clock-in toggle */}
                  <Switch
                    checked={member.is_clocked_in}
                    onCheckedChange={() => handleToggle(member.id, member.is_clocked_in)}
                    disabled={toggleClock.isPending}
                  />

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(member.id, member.name)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Shift Settings Panel — expands inline */}
                {expanded && (
                  <div className="border-t border-border pb-4">
                    <ShiftSettingsPanel member={member} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new staff */}
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") { setAdding(false); setNewName(""); }
            }}
            placeholder="Staff member name"
            className="bg-secondary border-border flex-1"
            autoFocus
          />
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || createStaff.isPending}
            className="gradient-gold text-primary-foreground px-4"
          >
            {createStaff.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </Button>
          <Button variant="ghost" onClick={() => { setAdding(false); setNewName(""); }} className="text-muted-foreground px-3">
            Cancel
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-gold hover:border-gold/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      )}

      <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">Click the chevron</span> next to any staff member to configure their shift hours, break window, and per-service duration overrides.
        Breaks are treated as hard-blocked time and are removed from the client booking calendar automatically.
      </div>
    </div>
  );
}
