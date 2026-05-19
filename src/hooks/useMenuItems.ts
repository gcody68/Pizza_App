import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";

export type MealPeriod = "breakfast" | "lunch" | "dinner" | "all-day";

export type ItemVariant = {
  label: string;
  price: number;
  isDefault: boolean;
};

export type ItemOptionGroup = {
  label: string;
  required: boolean;
  choices: string[];
};

export type MenuItem = {
  id: string;
  restaurant_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_placeholder: boolean;
  category: string;
  meal_period: MealPeriod;
  is_available: boolean;
  daily_stock: number | null;
  is_special: boolean;
  variants: ItemVariant[] | null;
  options: ItemOptionGroup[] | null;
  duration_minutes: number | null;
};

export const SERVICE_PERIOD_CATEGORIES = ["Breakfast", "Lunch", "Dinner", "All Day"] as const;
export const PERMANENT_CATEGORIES = ["Sides", "Drinks", "Desserts"] as const;
export const CATEGORIES = [...SERVICE_PERIOD_CATEGORIES, ...PERMANENT_CATEGORIES] as const;

export const ADMIN_ONLY_CATEGORIES: string[] = ["Sides", "Desserts"];

export const MEAL_PERIODS: { value: MealPeriod; label: string; hours: string }[] = [
  { value: "breakfast", label: "Breakfast", hours: "6am – 11am" },
  { value: "lunch", label: "Lunch", hours: "11am – 4pm" },
  { value: "dinner", label: "Dinner", hours: "4pm – Close" },
  { value: "all-day", label: "All Day", hours: "Always available" },
];

export function getCurrentMealPeriod(): MealPeriod {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16) return "dinner";
  return "dinner";
}

export function isMealPeriodActive(period: MealPeriod): boolean {
  if (period === "all-day") return true;
  return period === getCurrentMealPeriod();
}

export function getMealPeriodStartTime(period: MealPeriod): string {
  switch (period) {
    case "breakfast": return "6:00 AM";
    case "lunch": return "11:00 AM";
    case "dinner": return "4:00 PM";
    default: return "";
  }
}

export function useMenuItems(restaurantId?: string | null) {
  const demo = useDemoMode();
  return useQuery({
    queryKey: ["menu-items", restaurantId ?? "owner"],
    queryFn: async () => {
      if (demo) return demo.getMenuItems();
      let query = supabase.from("menu_items").select("*").order("sort_order");
      if (restaurantId) {
        query = query.eq("restaurant_id", restaurantId);
      } else {
        // No explicit restaurant — scope to the authenticated owner's restaurant
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
      return data as MenuItem[];
    },
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (item: {
      name: string;
      description: string;
      price: number;
      image_url: string | null;
      category: string;
      restaurant_id?: string | null;
      meal_period?: MealPeriod;
      is_available?: boolean;
      daily_stock?: number | null;
      is_special?: boolean;
      variants?: ItemVariant[] | null;
      options?: ItemOptionGroup[] | null;
    }) => {
      if (demo) {
        demo.createMenuItem({
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          category: item.category,
          meal_period: item.meal_period ?? "all-day",
          is_available: item.is_available ?? true,
          daily_stock: item.daily_stock ?? null,
          restaurant_id: null,
        });
        return;
      }
      let restaurant_id = item.restaurant_id ?? null;
      if (!restaurant_id) {
        const { data: { session } } = await supabase.auth.getSession();
        const isSuperAdmin = session?.user?.app_metadata?.super_admin === true;
        let q = supabase.from("restaurant_settings").select("id");
        if (session?.user?.id && !isSuperAdmin) q = q.eq("owner_id", session.user.id);
        const { data: rs } = await q.limit(1).maybeSingle();
        restaurant_id = rs?.id ?? null;
      }
      const { error } = await supabase.from("menu_items").insert({
        ...item,
        restaurant_id,
        meal_period: item.meal_period ?? "all-day",
        is_available: item.is_available ?? true,
        daily_stock: item.daily_stock ?? null,
        is_special: item.is_special ?? false,
        is_placeholder: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}

export function useUpsertMenuItem() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (item: Partial<MenuItem> & { id: string }) => {
      if (demo) { demo.upsertMenuItem(item.id, item); return; }
      const { id, ...rest } = item;
      const { error } = await supabase
        .from("menu_items")
        .update({ ...rest, is_placeholder: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (id: string) => {
      if (demo) { demo.deleteMenuItem(id); return; }
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}

export function useDecrementStock() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (items: { id: string; quantity: number }[]) => {
      if (demo) { demo.decrementStock(items); return; }
      for (const { id, quantity } of items) {
        const { data } = await supabase
          .from("menu_items")
          .select("daily_stock")
          .eq("id", id)
          .maybeSingle();
        if (data?.daily_stock != null) {
          const newStock = Math.max(0, data.daily_stock - quantity);
          await supabase
            .from("menu_items")
            .update({ daily_stock: newStock })
            .eq("id", id);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-items"] }),
  });
}
