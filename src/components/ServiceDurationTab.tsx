import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMenuItems, useUpsertMenuItem, type MenuItem } from "@/hooks/useMenuItems";
import {
  useStaff,
  useUpsertStaffServiceDuration,
  useDeleteStaffServiceDuration,
  type StaffProfile,
} from "@/hooks/useStaff";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, ChevronDown, ChevronUp, Loader as Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C", "#38BDF8",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDuration(mins: number | null): string {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Per-staff overrides for a single service ──────────────────────────────────
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
  const del    = useDeleteStaffServiceDuration();

  const [overrides, setOverrides]     = useState<Record<string, number>>({});
  const [localVals, setLocalVals]     = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState<string | null>(null);
  const [loaded, setLoaded]           = useState(false);

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
        const color    = staff.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
        const existing = overrides[staff.id];
        const val      = localVals[staff.id] ?? "";
        const ph       = existing ? String(existing) : (defaultDuration ? String(defaultDuration) : "30");

        return (
          <div key={staff.id} className="flex items-center gap-2.5">
            {/* Staff avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {initials(staff.name)}
            </div>
            <span className="text-xs font-medium text-foreground w-16 flex-shrink-0 truncate" title={staff.name}>
              {staff.name}
            </span>
            {/* Current override badge */}
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

// ── Single service row ────────────────────────────────────────────────────────
function ServiceRow({
  item,
  staffList,
  restaurantId,
}: {
  item: MenuItem;
  staffList: StaffProfile[];
  restaurantId: string;
}) {
  const upsert = useUpsertMenuItem();
  const [draftDuration, setDraftDuration] = useState(
    item.duration_minutes != null ? String(item.duration_minutes) : "",
  );
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSaveDefault = async () => {
    const mins = draftDuration.trim() === "" ? null : parseInt(draftDuration, 10);
    if (mins !== null && (isNaN(mins) || mins <= 0)) {
      toast.error("Enter a valid duration");
      return;
    }
    setSaving(true);
    try {
      await upsert.mutateAsync({ id: item.id, duration_minutes: mins });
      toast.success(`${item.name}: default duration saved`);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Service thumbnail */}
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
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

        {/* Default duration input */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Input
            type="number"
            min="1"
            value={draftDuration}
            onChange={(e) => setDraftDuration(e.target.value)}
            placeholder="—"
            className="bg-secondary border-border h-8 text-sm w-20 text-center"
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveDefault(); }}
          />
          <span className="text-xs text-muted-foreground">min</span>
          <button
            onClick={handleSaveDefault}
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

      {/* Per-staff overrides — shown when expanded */}
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

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function ServiceDurationTab({ restaurantId }: { restaurantId: string }) {
  const { data: items = [], isLoading: itemsLoading } = useMenuItems(restaurantId);
  const { data: staffList = [], isLoading: staffLoading } = useStaff(restaurantId);

  // Group services by category in insertion order
  const grouped = (() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const item of items) {
      if (!seen.has(item.category)) { seen.add(item.category); order.push(item.category); }
    }
    return order.map((cat) => ({
      category: cat,
      items: items.filter((i) => i.category === cat),
    }));
  })();

  if (itemsLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        No services yet. Add services from your public page menu.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Callout */}
      <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gold flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground">Service Durations</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Set a <span className="text-foreground font-medium">default duration</span> for each service — this controls how time slots are blocked during booking.
          Click the chevron on any service to set a <span className="text-foreground font-medium">per-stylist override</span> (e.g. Marcus takes 55m for Color, Linda takes 70m).
        </p>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="w-10 flex-shrink-0" />
        <div className="flex-1">Service</div>
        <div className="flex-shrink-0 w-36 text-right pr-7">Default Duration</div>
        {staffList.length > 0 && <div className="w-7 flex-shrink-0" />}
      </div>

      {/* Services grouped by category */}
      {grouped.map(({ category, items: catItems }) => (
        <div key={category} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest px-1">
            {category}
          </h3>
          {catItems.map((item) => (
            <ServiceRow
              key={item.id}
              item={item}
              staffList={staffList}
              restaurantId={restaurantId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
