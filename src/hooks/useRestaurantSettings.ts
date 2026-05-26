import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RestaurantSettings {
  id: string;
  name: string;
  owner_id: string;
  auto_email_daily_report?: boolean;
  created_at: string;
}

export function useRestaurantSettings(restaurantId?: string | null) {
  return useQuery({
    queryKey: ["restaurant-settings", restaurantId],
    queryFn: async () => {
      if (restaurantId) {
        const { data } = await supabase
          .from("restaurant_settings")
          .select("*")
          .eq("id", restaurantId)
          .maybeSingle();
        return data as RestaurantSettings | null;
      }
      const { data } = await supabase
        .from("restaurant_settings")
        .select("*")
        .maybeSingle();
      return data as RestaurantSettings | null;
    },
    staleTime: 60_000,
  });
}

export function useUpdateSettings(restaurantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<RestaurantSettings>) => {
      const { error } = await supabase
        .from("restaurant_settings")
        .update(updates)
        .eq("id", restaurantId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurant-settings"] }),
  });
}
