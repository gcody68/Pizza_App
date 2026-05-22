import { createContext, useContext, ReactNode } from "react";

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
  tier: "pro",
  isPro: true,
  isBoutique: false,
  isUnpaid: false,
  hasNoSubscription: false,
  monthlyOrderCount: 0,
  boutiquOrderCap: BOUTIQUE_ORDER_CAP,
  isOrderCapReached: false,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return (
    <SubscriptionContext.Provider value={{
      tier: "pro",
      isPro: true,
      isBoutique: false,
      isUnpaid: false,
      hasNoSubscription: false,
      monthlyOrderCount: 0,
      boutiquOrderCap: BOUTIQUE_ORDER_CAP,
      isOrderCapReached: false,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
