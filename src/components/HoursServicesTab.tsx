import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMenuItems, useUpsertMenuItem, type MenuItem } from "@/hooks/useMenuItems";
import {
  useStaff,
  useUpsertStaffServiceDuration,
  useDeleteStaffServiceDuration,
  type StaffProfile,
} from "@/hooks/useStaff";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type ServiceHours, type ShiftConfig, type BusinessHours } from "@/hooks/useRestaurantSettings";
import { Clock, Store, Scissors, ChevronDown, ChevronUp, Loader as Loader2, Info } from "lucide-react";
import { toast } from "sonner";

// ── Salon business hours don't use meal shifts, so we hide that block for salons ──

type MealKey = keyof ServiceHours;

const SHIFTS: { key: MealKey; label: string; description: string }[] = [
  { key: "breakfast", label: "Breakfast", description: "Morning service window" },
  { key: "lunch", label: "Lunch", description: "Midday service window" },
  { key: "dinner", label: "Dinner", description: "Evening service window" },
];

const AVATAR_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C", "#38BDF8",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Per-staff duration overrides ──────────────────────────────────────────────
function StaffOverrideRows({
  menuItemId,
  defaultDuration,
  staffList,
}: {
  menuItemId: string;
  defaultDuration: number | null;
  staffList: StaffProfile[];
}) {
  const upsert = useUpsertStaffServiceDuration();
  const del = useDeleteStaffServiceDuration();
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [localVals, setLocalVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("staff_service_durations")
      .select("staff_id, duration_minutes")
      .eq("menu_item_id", menuItemId)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const r of data ?? []) map[r.staff_id] = r.duration_minutes;
        setOverrides(map);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [menuItemId]);

  const handleSave = async (staffId: string, staffName: string) => {
    const raw = localVals[staffId];
    setSaving(staffId);
    try {
      if (!raw || raw.trim() === "") {
        await del.mutateAsync({ staff_id: staffId, menu_item_id: menuItemId });
        setOverrides((prev) => { const n = { ...prev }; delete n[staffId]; return n; });
        setLocalVals((prev) => { const n = { ...prev }; delete n[staffId]; return n; });
        toast.success(`${staffName} reverted to default`);
      } else {
        const mins = parseInt(raw, 10);
        if (isNaN(mins) || mins <= 0) { toast.error("Enter a valid duration"); return; }
        await upsert.mutateAsync({ staff_id: staffId, menu_item_id: menuItemId, duration_minutes: mins });
        setOverrides((prev) => ({ ...prev, [staffId]: mins }));
        toast.success(`${staffName}: ${mins}m saved`);
      }
    } catch { toast.error("Failed to save"); }
    finally { setSaving(null); }
  };

  if (!loaded) {
    return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-2 pt-1">
      {staffList.map((staff, i) => {
        const color = staff.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
        const existing = overrides[staff.id];
        const val = localVals[staff.id] ?? "";
        const ph = existing ? String(existing) : (defaultDuration ? String(defaultDuration) : "30");
        return (
          <div key={staff.id} className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {initials(staff.name)}
            </div>
            <span className="text-xs font-medium text-foreground w-16 flex-shrink-0 truncate" title={staff.name}>
              {staff.name}
            </span>
            {existing !== undefined && localVals[staff.id] === undefined && (
              <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/25 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {existing}m
              </span>
            )}
            <div className="flex-1 flex items-center gap-1">
              <Input
                type="number"
                min="1"
                value={val}
                onChange={(e) => setLocalVals((prev) => ({ ...prev, [staff.id]: e.target.value }))}
                placeholder={`${ph}m`}
                className="bg-secondary border-border h-7 text-xs flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(staff.id, staff.name); }}
              />
              <span className="text-[10px] text-muted-foreground flex-shrink-0">min</span>
            </div>
            <button
              onClick={() => handleSave(staff.id, staff.name)}
              disabled={saving === staff.id || !val.trim()}
              className="text-[10px] font-semibold text-gold border border-gold/40 rounded px-2 h-7 hover:bg-gold/5 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {saving === staff.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : "Set"}
            </button>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Clear a field and click Set to revert a stylist to the service default.
      </p>
    </div>
  );
}

// ── Single service row with duration + processing gap ─────────────────────────
function ServiceRow({ item, staffList }: { item: MenuItem; staffList: StaffProfile[] }) {
  const upsert = useUpsertMenuItem();
  const [draftDuration, setDraftDuration] = useState(
    item.duration_minutes != null ? String(item.duration_minutes) : "",
  );
  const [draftGap, setDraftGap] = useState(
    item.processing_gap_minutes != null ? String(item.processing_gap_minutes) : "",
  );
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    const mins = draftDuration.trim() === "" ? null : parseInt(draftDuration, 10);
    const gap = draftGap.trim() === "" ? null : parseInt(draftGap, 10);
    if (mins !== null && (isNaN(mins) || mins <= 0)) { toast.error("Enter a valid duration"); return; }
    if (gap !== null && (isNaN(gap) || gap <= 0)) { toast.error("Enter a valid processing gap"); return; }
    setSaving(true);
    try {
      await upsert.mutateAsync({ id: item.id, duration_minutes: mins, processing_gap_minutes: gap });
      toast.success(`${item.name}: saved`);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Thumbnail */}
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-muted-foreground/40" />
          </div>
        )}

        {/* Name + category */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight truncate">{item.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{item.category}</p>
        </div>

        {/* Duration + gap inputs */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {/* Default duration */}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              value={draftDuration}
              onChange={(e) => setDraftDuration(e.target.value)}
              placeholder="—"
              className="bg-secondary border-border h-8 text-sm w-16 text-center"
              title="Default Duration (minutes)"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <span className="text-[10px] text-muted-foreground">min</span>
          </div>

          {/* Processing gap */}
          <div className="flex items-center gap-1 relative group">
            <Input
              type="number"
              min="1"
              value={draftGap}
              onChange={(e) => setDraftGap(e.target.value)}
              placeholder="gap"
              className="bg-secondary border-border h-8 text-sm w-16 text-center border-dashed"
              title="Processing Gap (minutes)"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
            <div className="relative">
              <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
              <div className="absolute bottom-full right-0 mb-1.5 w-56 bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-[11px] text-muted-foreground leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Allows clients to automatically book quick services (like trims or express cuts) while color is processing.
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-semibold text-gold border border-gold/40 rounded-md px-2.5 h-8 hover:bg-gold/5 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </button>
        </div>

        {/* Expand per-stylist overrides */}
        {staffList.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
            title="Per-stylist overrides"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-4 pb-4 pt-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Per-Stylist Override
          </p>
          <StaffOverrideRows
            menuItemId={item.id}
            defaultDuration={item.duration_minutes}
            staffList={staffList}
          />
        </div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  restaurantId: string;
  isSalon: boolean;
  // Restaurant (non-salon) service hours props
  serviceHours: ServiceHours;
  onServiceHoursChange: (h: ServiceHours) => void;
  businessHours: BusinessHours;
  onBusinessHoursChange: (h: BusinessHours) => void;
  onSave: () => void;
  saving: boolean;
};

// ── Main export ───────────────────────────────────────────────────────────────
export default function HoursServicesTab({
  restaurantId,
  isSalon,
  serviceHours,
  onServiceHoursChange,
  businessHours,
  onBusinessHoursChange,
  onSave,
  saving,
}: Props) {
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(restaurantId);
  const { data: staffList = [], isLoading: staffLoading } = useStaff(restaurantId);

  const grouped = (() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of items) {
      if (!seen.has(item.category)) { seen.add(item.category); order.push(item.category); }
    }
    return order.map((cat) => ({ category: cat, items: items.filter((i) => i.category === cat) }));
  })();

  const updateShift = (key: MealKey, patch: Partial<ShiftConfig>) => {
    onServiceHoursChange({ ...serviceHours, [key]: { ...serviceHours[key], ...patch } });
  };

  return (
    <div className="space-y-10">

      {/* ── Business Hours (both salon + restaurant) ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-4 h-4 text-gold" />
          <p className="text-sm font-semibold text-foreground">Business Hours</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {isSalon
            ? "Your operating window. The booking calendar uses these hours to define the available appointment range."
            : "Your overall operating window. The Kitchen view shows orders from today's opening time."}
        </p>
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> Opens
              </Label>
              <Input
                type="time"
                value={businessHours.open}
                onChange={(e) => onBusinessHoursChange({ ...businessHours, open: e.target.value })}
                className="bg-secondary border-border text-sm"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> Closes
              </Label>
              <Input
                type="time"
                value={businessHours.close}
                onChange={(e) => onBusinessHoursChange({ ...businessHours, close: e.target.value })}
                className="bg-secondary border-border text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Shift Hours (restaurant only) ── */}
      {!isSalon && (
        <div className="border-t border-border pt-6">
          <p className="text-sm font-semibold text-foreground mb-1">Shift Hours</p>
          <p className="text-xs text-muted-foreground mb-4">
            Define when each meal period is active. Items tagged for a period only appear during its window.
          </p>
          <div className="space-y-4">
            {SHIFTS.map(({ key, label, description }) => {
              const shift = serviceHours[key];
              return (
                <div key={key} className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch checked={shift.enabled} onCheckedChange={(v) => updateShift(key, { enabled: v })} />
                  </div>
                  {shift.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Start Time
                        </Label>
                        <Input type="time" value={shift.start} onChange={(e) => updateShift(key, { start: e.target.value })} className="bg-secondary border-border text-sm" />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" /> End Time
                        </Label>
                        <Input type="time" value={shift.end} onChange={(e) => updateShift(key, { end: e.target.value })} className="bg-secondary border-border text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Service Durations (salon only) ── */}
      {isSalon && (
        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Scissors className="w-4 h-4 text-gold" />
            <p className="text-sm font-semibold text-foreground">Service Durations</p>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Set a <span className="text-foreground font-medium">default duration</span> for each service and an optional{" "}
            <span className="text-foreground font-medium">processing gap</span> — unattended minutes during which another booking can run in parallel.
            Expand any row to set <span className="text-foreground font-medium">per-stylist overrides</span>.
          </p>

          {itemsLoading || staffLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No services yet. Add services from your public menu page.
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-3 px-4 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="w-10 flex-shrink-0" />
                <div className="flex-1">Service</div>
                <div className="flex-shrink-0 flex items-center gap-2 pr-7">
                  <span className="w-16 text-center">Duration</span>
                  <span className="w-16 text-center">Gap</span>
                  <span className="w-12" />
                </div>
                {staffList.length > 0 && <div className="w-7 flex-shrink-0" />}
              </div>

              <div className="space-y-6">
                {grouped.map(({ category, items: catItems }) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest px-1">
                      {category}
                    </h3>
                    {catItems.map((item) => (
                      <ServiceRow key={item.id} item={item} staffList={staffList} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Save button (hours persist via parent for both modes) ── */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg gradient-gold text-primary-foreground font-semibold text-sm transition-opacity disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
