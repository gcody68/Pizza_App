import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";

export type ShiftConfig = {
  enabled: boolean;
  start: string;
  end: string;
};

export type ServiceHours = {
  breakfast: ShiftConfig;
  lunch: ShiftConfig;
  dinner: ShiftConfig;
};

export const DEFAULT_SERVICE_HOURS: ServiceHours = {
  breakfast: { enabled: true, start: "06:00", end: "11:00" },
  lunch: { enabled: true, start: "11:00", end: "16:00" },
  dinner: { enabled: true, start: "16:00", end: "23:00" },
};

export type BusinessHours = {
  open: string;  // HH:MM
  close: string; // HH:MM
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  open: "06:00",
  close: "23:00",
};

export type RestaurantSettings = {
  id: string;
  owner_id: string | null;
  business_name: string;
  business_address: string | null;
  business_phone: string | null;
  header_image_url: string | null;
  logo_url: string | null;
  theme: string;
  bg_style: string | null;
  payment_enabled: boolean | null;
  stripe_public_key: string | null;
  stripe_secret_key: string | null;
  kitchen_view_enabled: boolean | null;
  show_gallery: boolean | null;
  service_hours: ServiceHours | null;
  business_hours: BusinessHours | null;
  unavailable_display: "hide" | "gray" | null;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean | null;
  sales_tax_rate: number | null;
  billing_email: string | null;
};

/**
 * Load restaurant settings. Two modes:
 *  - Pass restaurantId to load a specific restaurant by ID (public customer view).
 *  - Pass no argument to load the authenticated user's own restaurant (admin view).
 */
export function useRestaurantSettings(restaurantId?: string | null) {
  const demo = useDemoMode();
  return useQuery({
    queryKey: ["restaurant-settings", restaurantId ?? "owner"],
    queryFn: async () => {
      if (demo) return demo.getSettings();
      // Public view: load by explicit ID resolved from subdomain/domain
      if (restaurantId) {
        const { data, error } = await supabase
          .from("restaurant_settings")
          .select("*")
          .eq("id", restaurantId)
          .maybeSingle();
        if (error) throw error;
        return data as RestaurantSettings | null;
      }

      // Admin view: load the authenticated owner's restaurant
      const { data: { session } } = await supabase.auth.getSession();
      const isSuperAdmin = session?.user?.app_metadata?.super_admin === true;
      let query = supabase.from("restaurant_settings").select("*");
      if (session?.user?.id && !isSuperAdmin) {
        query = query.eq("owner_id", session.user.id);
      }
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return data as RestaurantSettings | null;
    },
  });
}

/**
 * Returns the [start, end) ISO timestamps for the current business day window.
 *
 * Logic:
 *  - The "business day" starts at `open` time and runs until `open` time the NEXT calendar day.
 *  - If the current time is BEFORE today's open time, we're still in yesterday's business day,
 *    so the window started at yesterday's open time.
 *  - Example: open=06:00, close=23:00, now=04:00 → window is yesterday 06:00 → today 06:00.
 *  - The `close` value is informational but the hard reset boundary is always the next open time.
 */
export function getBusinessDayWindow(businessHours: BusinessHours | null): { start: Date; end: Date } {
  const bh = businessHours ?? DEFAULT_BUSINESS_HOURS;
  const [openH, openM] = bh.open.split(":").map(Number);

  const now = new Date();
  const todayOpen = new Date(now);
  todayOpen.setHours(openH, openM, 0, 0);

  // If we haven't hit today's opening yet, the current business day started yesterday
  const dayStart = now < todayOpen
    ? new Date(todayOpen.getTime() - 86400000)
    : todayOpen;

  const dayEnd = new Date(dayStart.getTime() + 86400000);

  return { start: dayStart, end: dayEnd };
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const demo = useDemoMode();
  return useMutation({
    mutationFn: async (updates: Partial<RestaurantSettings> & { id: string }) => {
      if (demo) { demo.updateSettings(updates); return; }
      const { id, ...rest } = updates;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated — please log in again.");
      const { data: updated, error } = await supabase
        .from("restaurant_settings")
        .update(rest)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error("Save failed — your session may have expired. Please log out and back in.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurant-settings"] }),
  });
}
