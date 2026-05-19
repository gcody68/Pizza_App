import { useState } from "react";
import { useStaff, useToggleClockIn, useCreateStaff, useDeleteStaff } from "@/hooks/useStaff";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCheck, Plus, Trash2, Loader as Loader2 } from "lucide-react";
import { toast } from "sonner";

const AVATAR_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C", "#38BDF8",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function StaffCheckInWidget({ restaurantId }: { restaurantId: string }) {
  const { data: staff, isLoading } = useStaff(restaurantId);
  const toggleClock = useToggleClockIn();
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

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
      toast.success(`${name} removed`);
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  const clockedIn = (staff ?? []).filter((s) => s.is_clocked_in).length;
  const total = (staff ?? []).length;

  return (
    <div className="space-y-4">
      {/* Header stat */}
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
            const color = member.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                  member.is_clocked_in
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border bg-secondary/30"
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initials(member.name)}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{member.name}</p>
                  <p className={`text-xs ${member.is_clocked_in ? "text-green-400" : "text-muted-foreground"}`}>
                    {member.is_clocked_in ? "Clocked In — Available for bookings" : "Clocked Out"}
                  </p>
                </div>

                {/* Toggle */}
                <Switch
                  checked={member.is_clocked_in}
                  onCheckedChange={() => handleToggle(member.id, member.is_clocked_in)}
                  disabled={toggleClock.isPending}
                />

                {/* Delete */}
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  title="Remove staff member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new staff member */}
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
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

      {/* Callout */}
      <div className="rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">Clocked-in staff</span> appear in the booking modal so customers can request a specific stylist.
        Only clocked-in stylists are included in the availability algorithm.
      </div>
    </div>
  );
}
