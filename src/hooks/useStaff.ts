import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffProfile = {
  id: string;
  restaurant_id: string;
  name: string;
  is_clocked_in: boolean;
  color: string | null;
  created_at: string;
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

export function useAvailableSlots(
  restaurantId: string | null | undefined,
  date: string,
  durationMinutes: number | null | undefined,
  staffId: string | null,
) {
  return useQuery({
    queryKey: ["available-slots", restaurantId, date, durationMinutes, staffId],
    queryFn: async () => {
      if (!restaurantId || !date || !durationMinutes) return [] as string[];
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_restaurant_id: restaurantId,
        p_date: date,
        p_duration_minutes: durationMinutes,
        p_staff_id: staffId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!restaurantId && !!date && !!durationMinutes,
    staleTime: 30_000,
  });
}
