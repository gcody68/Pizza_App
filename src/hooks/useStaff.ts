import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DayAvailability {
  enabled: boolean;
  start: string;
  end: string;
}

export interface WeeklyAvailability {
  Mon: DayAvailability;
  Tue: DayAvailability;
  Wed: DayAvailability;
  Thu: DayAvailability;
  Fri: DayAvailability;
  Sat: DayAvailability;
  Sun: DayAvailability;
}

export interface StaffProfile {
  id: string;
  restaurant_id: string;
  name: string;
  is_clocked_in: boolean;
  color: string | null;
  color_index: number | null;
  shift_start: string | null;
  shift_end: string | null;
  break_start: string | null;
  break_end: string | null;
  weekly_availability: WeeklyAvailability | null;
  created_at: string;
}

export interface ShiftLog {
  id: string;
  staff_id: string;
  restaurant_id: string;
  event: "clock_in" | "clock_out";
  logged_at: string;
}

const PALETTE = [
  "#C9A84C", "#7EB8B0", "#E07B7B", "#A07BD4", "#60A5FA", "#34D399", "#FB923C",
];

export function useStaff(restaurantId: string | null | undefined) {
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
      return (data ?? []) as StaffProfile[];
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
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

      const { data: staffRow } = await supabase
        .from("staff_profiles")
        .select("restaurant_id")
        .eq("id", id)
        .maybeSingle();
      if (staffRow?.restaurant_id) {
        await supabase.from("shift_logs").insert({
          staff_id: id,
          restaurant_id: staffRow.restaurant_id,
          event: is_clocked_in ? "clock_in" : "clock_out",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["shift-logs"] });
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurant_id,
      name,
      colorIndexHint,
    }: {
      restaurant_id: string;
      name: string;
      colorIndexHint?: number;
    }): Promise<StaffProfile> => {
      let colorIndex = colorIndexHint ?? 0;
      if (colorIndexHint === undefined) {
        const { data: existing } = await supabase
          .from("staff_profiles")
          .select("id")
          .eq("restaurant_id", restaurant_id);
        colorIndex = (existing?.length ?? 0) % PALETTE.length;
      }
      const color = PALETTE[colorIndex % PALETTE.length];
      const { data, error } = await supabase
        .from("staff_profiles")
        .insert({ restaurant_id, name, is_clocked_in: false, color, color_index: colorIndex })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as StaffProfile;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useUpdateStaffAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, weekly_availability }: { id: string; weekly_availability: WeeklyAvailability }) => {
      const { error } = await supabase
        .from("staff_profiles")
        .update({ weekly_availability })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}

export function useShiftLogs(restaurantId: string | null | undefined, startIso: string, endIso: string) {
  return useQuery({
    queryKey: ["shift-logs", restaurantId, startIso, endIso],
    queryFn: async () => {
      if (!restaurantId) return [] as ShiftLog[];
      const { data, error } = await supabase
        .from("shift_logs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("logged_at", `${startIso}T00:00:00`)
        .lte("logged_at", `${endIso}T23:59:59`)
        .order("staff_id")
        .order("logged_at");
      if (error) return [] as ShiftLog[];
      return (data ?? []) as ShiftLog[];
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
}
