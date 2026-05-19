import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffProfile = {
  id: string;
  restaurant_id: string;
  name: string;
  is_clocked_in: boolean;
  color: string | null;
  shift_start: string | null;  // "HH:MM" 24h
  shift_end: string | null;
  break_start: string | null;
  break_end: string | null;
  created_at: string;
};

export type StaffServiceDuration = {
  id: string;
  staff_id: string;
  menu_item_id: string;
  duration_minutes: number;
};

export function useStaff(restaurantId?: string | null) {
  return useQuery({
    queryKey: ["staff", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [] as StaffProfile[];
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at");
      if (error) throw error;
      return data as StaffProfile[];
    },
    enabled: !!restaurantId,
  });
}

export function useClockedInStaff(restaurantId?: string | null) {
  return useQuery({
    queryKey: ["staff-clocked-in", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [] as StaffProfile[];
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_clocked_in", true)
        .order("created_at");
      if (error) throw error;
      return data as StaffProfile[];
    },
    enabled: !!restaurantId,
  });
}

export function useToggleClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_clocked_in }: { id: string; is_clocked_in: boolean }) => {
      const { error } = await supabase
        .from("staff_profiles")
        .update({ is_clocked_in })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-clocked-in"] });
    },
  });
}

export function useUpdateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      shift_start,
      shift_end,
      break_start,
      break_end,
    }: {
      id: string;
      shift_start: string | null;
      shift_end: string | null;
      break_start: string | null;
      break_end: string | null;
    }) => {
      const { error } = await supabase
        .from("staff_profiles")
        .update({ shift_start, shift_end, break_start, break_end })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-clocked-in"] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ restaurant_id, name }: { restaurant_id: string; name: string }) => {
      const { error } = await supabase
        .from("staff_profiles")
        .insert({ restaurant_id, name, is_clocked_in: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-clocked-in"] });
    },
  });
}

// ── Service duration overrides ────────────────────────────────────────────────

export function useStaffServiceDurations(staffId?: string | null) {
  return useQuery({
    queryKey: ["staff-service-durations", staffId],
    queryFn: async () => {
      if (!staffId) return [] as StaffServiceDuration[];
      const { data, error } = await supabase
        .from("staff_service_durations")
        .select("*")
        .eq("staff_id", staffId);
      if (error) throw error;
      return data as StaffServiceDuration[];
    },
    enabled: !!staffId,
  });
}

export function useUpsertStaffServiceDuration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      staff_id,
      menu_item_id,
      duration_minutes,
    }: {
      staff_id: string;
      menu_item_id: string;
      duration_minutes: number;
    }) => {
      const { error } = await supabase
        .from("staff_service_durations")
        .upsert({ staff_id, menu_item_id, duration_minutes }, { onConflict: "staff_id,menu_item_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["staff-service-durations", vars.staff_id] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

export function useDeleteStaffServiceDuration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staff_id, menu_item_id }: { staff_id: string; menu_item_id: string }) => {
      const { error } = await supabase
        .from("staff_service_durations")
        .delete()
        .eq("staff_id", staff_id)
        .eq("menu_item_id", menu_item_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["staff-service-durations", vars.staff_id] });
      qc.invalidateQueries({ queryKey: ["available-slots"] });
    },
  });
}

// ── Available time slots (calls Supabase RPC) ─────────────────────────────────
export function useAvailableSlots(
  restaurantId: string | null | undefined,
  date: string,
  durationMinutes: number | null | undefined,
  staffId: string | null,
  menuItemId?: string | null,
) {
  return useQuery({
    queryKey: ["available-slots", restaurantId, date, durationMinutes, staffId, menuItemId],
    queryFn: async () => {
      if (!restaurantId || !date || !durationMinutes) return [] as string[];
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_restaurant_id:    restaurantId,
        p_date:             date,
        p_duration_minutes: durationMinutes,
        p_staff_id:         staffId ?? null,
        p_menu_item_id:     menuItemId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!restaurantId && !!date && durationMinutes != null && durationMinutes > 0,
    staleTime: 30_000,
  });
}
