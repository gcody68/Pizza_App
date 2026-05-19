import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/contexts/AdminContext";
import { useRestaurant } from "@/contexts/RestaurantContext";

export type SubscriptionTier = "loading" | "none" | "unpaid" | "boutique" | "pro";

type SubscriptionContextType = {
  tier: SubscriptionTier;
  isPro: boolean;
  isBoutique: boolean;
  isUnpaid: boolean;
  hasNoSubscription: boolean;
  monthlyOrderCount: number;
  boutiquOrderCap: number;
  isOrderCapReached: boolean;
};

const BOUTIQUE_ORDER_CAP = 1000;

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: "loading",
  isPro: false,
  isBoutique: false,
  isUnpaid: false,
  hasNoSubscription: false,
  monthlyOrderCount: 0,
  boutiquOrderCap: BOUTIQUE_ORDER_CAP,
  isOrderCapReached: false,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isSuperAdmin, session } = useAdmin();
  const { restaurantId } = useRestaurant();
  const userEmail = session?.user?.email ?? null;

  // Primary lookup: by merchant_email (written by stripe-webhook on checkout.session.completed)
  // Falls back to restaurant_id for rows written by older webhook logic.
  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", userEmail ?? restaurantId],
    enabled: (!isSuperAdmin) && !!(userEmail || restaurantId),
    queryFn: async () => {
      if (userEmail) {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan_name, status")
          .or(`merchant_email.eq.${userEmail},login_email.eq.${userEmail}`)
          .eq("status", "active")
          .maybeSingle();
        if (data) return data;
      }
      // fallback: by restaurant_id (anon public menu path or legacy rows)
      if (restaurantId) {
        const { data } = await supabase
          .from("subscriptions")
          .select("plan_name, status")
          .eq("restaurant_id", restaurantId)
          .maybeSingle();
        return data ?? null;
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Count this month's orders for boutique cap enforcement
  const { data: orderCount } = useQuery({
    queryKey: ["monthly-order-count", restaurantId],
    enabled: !!restaurantId && !isSuperAdmin,
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId!)
        .gte("created_at", start.toISOString());
      return count ?? 0;
    },
    staleTime: 60 * 1000,
  });

  let tier: SubscriptionTier = "loading";

  if (isSuperAdmin) {
    tier = "pro"; // super admins bypass all gating
  } else if (subLoading) {
    tier = "loading";
  } else if (!sub) {
    tier = "none";
  } else if (sub.status !== "active") {
    tier = "unpaid";
  } else if (sub.plan_name === "pro") {
    tier = "pro";
  } else if (sub.plan_name === "boutique") {
    tier = "boutique";
  } else {
    // active subscription but unknown plan_name — treat as pro to not block
    tier = "pro";
  }

  const monthlyOrderCount = orderCount ?? 0;
  const isOrderCapReached = tier === "boutique" && monthlyOrderCount >= BOUTIQUE_ORDER_CAP;

  return (
    <SubscriptionContext.Provider value={{
      tier,
      isPro: tier === "pro",
      isBoutique: tier === "boutique",
      isUnpaid: tier === "unpaid",
      hasNoSubscription: tier === "none",
      monthlyOrderCount,
      boutiquOrderCap: BOUTIQUE_ORDER_CAP,
      isOrderCapReached,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
