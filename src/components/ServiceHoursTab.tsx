import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type ServiceHours, type ShiftConfig, type BusinessHours } from "@/hooks/useRestaurantSettings";
import { Clock, Store } from "lucide-react";

type MealKey = keyof ServiceHours;

const SHIFTS: { key: MealKey; label: string; description: string }[] = [
  { key: "breakfast", label: "Breakfast", description: "Morning service window" },
  { key: "lunch", label: "Lunch", description: "Midday service window" },
  { key: "dinner", label: "Dinner", description: "Evening service window" },
];

type Props = {
  serviceHours: ServiceHours;
  onChange: (hours: ServiceHours) => void;
  businessHours: BusinessHours;
  onBusinessHoursChange: (hours: BusinessHours) => void;
  unavailableDisplay?: "hide" | "gray";
  onDisplayChange?: (val: "hide" | "gray") => void;
};

export default function ServiceHoursTab({
  serviceHours,
  onChange,
  businessHours,
  onBusinessHoursChange,
}: Props) {
  const updateShift = (key: MealKey, patch: Partial<ShiftConfig>) => {
    onChange({ ...serviceHours, [key]: { ...serviceHours[key], ...patch } });
  };

  return (
    <div className="space-y-6">

      {/* ── Business Hours ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-4 h-4 text-gold" />
          <p className="text-sm font-semibold text-foreground">Business Hours</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Your overall operating window. The Kitchen view shows orders from today's opening time and resets when the next business day begins.
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
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Kitchen totals reset daily at your opening time. Orders before that time count toward the previous business day.
          </p>
        </div>
      </div>

      {/* ── Shift Hours ── */}
      <div className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-foreground mb-1">Shift Hours</p>
        <p className="text-xs text-muted-foreground mb-4">
          Define when each meal period is active. Items tagged for a period only appear (or become orderable) during its window.
        </p>

        <div className="space-y-4">
          {SHIFTS.map(({ key, label, description }) => {
            const shift = serviceHours[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={shift.enabled}
                    onCheckedChange={(v) => updateShift(key, { enabled: v })}
                  />
                </div>

                {shift.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Start Time
                      </Label>
                      <Input
                        type="time"
                        value={shift.start}
                        onChange={(e) => updateShift(key, { start: e.target.value })}
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> End Time
                      </Label>
                      <Input
                        type="time"
                        value={shift.end}
                        onChange={(e) => updateShift(key, { end: e.target.value })}
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Menu Ordering Behaviour ── */}
      <div className="border-t border-border pt-5">
        <p className="text-sm font-semibold text-foreground mb-2">Menu Ordering &amp; Availability</p>
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            <span className="text-foreground font-medium">Smart ordering —</span> Items currently being served ("Now Serving") and items available all day are automatically sorted to the top of each category, reducing customer scrolling.
          </p>
          <p>
            <span className="text-foreground font-medium">Out-of-window items —</span> Items outside their scheduled service window remain visible but are disabled — customers can see them on the menu yet cannot add them to an order until that service period opens.
          </p>
        </div>
      </div>
    </div>
  );
}
