import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";

export type GalleryItem = {
  id: string;
  restaurant_id: string | null;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export function useGalleryItems(restaurantId?: string | null) {
  const demo = useDemoMode();
  return useQuery({
    queryKey: ["gallery-items", restaurantId ?? "owner"],
    queryFn: async () => {
      if (demo) return demo.getGalleryItems();
      let query = supabase.from("gallery_items").select("*").order("sort_order");
      if (restaurantId) {
        query = query.eq("restaurant_id", restaurantId);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const isSuperAdmin = session?.user?.app_metadata?.super_admin === true;
        if (session?.user?.id && !isSuperAdmin) {
          const { data: rs } = await supabase
            .from("restaurant_settings")
            .select("id")
            .eq("owner_id", session.user.id)
            .limit(1)
            .maybeSingle();
          if (rs?.id) query = query.eq("restaurant_id", rs.id);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as GalleryItem[];
    },
  });
}

export function useAddGalleryItem() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (item: { image_url: string; caption?: string; restaurant_id?: string | null }) => {
      if (demo) { demo.addGalleryItem(item); return; }
      let restaurant_id = item.restaurant_id ?? null;
      if (!restaurant_id) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: rs } = await supabase
            .from("restaurant_settings")
            .select("id")
            .eq("owner_id", session.user.id)
            .limit(1)
            .maybeSingle();
          restaurant_id = rs?.id ?? null;
        }
      }
      const { error } = await supabase.from("gallery_items").insert({ ...item, restaurant_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery-items"] }),
  });
}

export function useDeleteGalleryItem() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (id: string) => {
      if (demo) { demo.deleteGalleryItem(id); return; }
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery-items"] }),
  });
}
