import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SUBDOMAIN_HOST = "loomishq.com";
// Loomis's own domains — never treated as customer custom domains
const LOOMIS_DOMAINS = ["loomis-hq.com", "loomishq.com"];

export type RestaurantResolution =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "found"; restaurantId: string }
  | { status: "root" }; // bare domain with no subdomain — show landing

type HostResolution =
  | { type: "subdomain"; slug: string }
  | { type: "custom_domain"; hostname: string }
  | { type: "none" };

function resolveHost(): HostResolution {
  const hostname = window.location.hostname;

  // Our own subdomain: *.loomishq.com
  if (hostname.endsWith(`.${SUBDOMAIN_HOST}`)) {
    const slug = hostname.slice(0, -(SUBDOMAIN_HOST.length + 1));
    return { type: "subdomain", slug };
  }

  // Root domain — show landing
  if (hostname === SUBDOMAIN_HOST) {
    return { type: "none" };
  }

  // Loomis's own domains (e.g. app.loomis-hq.com) — never customer custom domains
  const isLoomisHost = LOOMIS_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  if (isLoomisHost) {
    return { type: "none" };
  }

  // Non-production hosts: localhost, *.vercel.app, *.bolt.new, *.lovable.app, etc.
  const devPatterns = ["localhost", "127.0.0.1", ".vercel.app", ".bolt.new", ".lovable.app", ".lovableproject.com"];
  const isDevHost = devPatterns.some((p) => hostname === p || hostname.endsWith(p));
  if (isDevHost) {
    return { type: "none" };
  }

  // If VITE_RESTAURANT_ID is set, this is a dev/staging/preview build.
  // Don't attempt a custom domain lookup — use the env var instead.
  if (import.meta.env.VITE_RESTAURANT_ID) {
    return { type: "none" };
  }

  // Anything else is treated as a customer's custom domain (e.g. menu.joesdiner.com)
  return { type: "custom_domain", hostname };
}

// ?test_res_id=UUID — injected by the Admin "Open My Shop" button for test mode
function resolveTestParamId(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("test_res_id");
  } catch {
    return null;
  }
}

type RestaurantContextType = {
  resolution: RestaurantResolution;
  restaurantId: string | null;
  isCustomDomainHost: boolean;
};

const RestaurantContext = createContext<RestaurantContextType>({
  resolution: { status: "root" },
  restaurantId: null,
  isCustomDomainHost: false,
});

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const hostResolution = resolveHost();
  const testParamId = resolveTestParamId();

  const queryKey =
    hostResolution.type === "subdomain"
      ? ["restaurant-resolution", "subdomain", hostResolution.slug]
      : hostResolution.type === "custom_domain"
        ? ["restaurant-resolution", "custom_domain", hostResolution.hostname]
        : ["restaurant-resolution", "none", testParamId ?? ""];

  const { data: resolution, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<RestaurantResolution> => {
      // 1. ?test_res_id param — highest priority
      if (testParamId) {
        return { status: "found", restaurantId: testParamId };
      }

      // 2a. Subdomain routing — *.loomishq.com
      if (hostResolution.type === "subdomain") {
        const { data, error } = await supabase
          .from("restaurant_settings")
          .select("id")
          .eq("subdomain", hostResolution.slug)
          .maybeSingle();
        if (error || !data) return { status: "not-found" };
        return { status: "found", restaurantId: data.id };
      }

      // 2b. Custom domain routing — any other hostname
      // This path is strictly isolated: only look up by custom_domain, never fall
      // through to env/session fallbacks. Leaking to another tenant's data via
      // VITE_RESTAURANT_ID would break multi-tenancy.
      if (hostResolution.type === "custom_domain") {
        // Always strip www. and protocol so workoutdailyfree-apparel.com,
        // www.workoutdailyfree-apparel.com, and https://www.workoutdailyfree-apparel.com
        // all resolve to the same stored bare domain.
        const bare = hostResolution.hostname.replace(/^www\./, "");
        const withWww = `www.${bare}`;
        const { data } = await supabase
          .from("restaurant_settings")
          .select("id")
          .or(`custom_domain.eq.${bare},custom_domain.eq.${withWww}`)
          .maybeSingle();
        if (data?.id) return { status: "found", restaurantId: data.id };
        return { status: "not-found" };
      }

      // 3. Dev/preview env var — when VITE_RESTAURANT_ID is set on a non-production
      //    host this is a preview build for a specific restaurant. Return immediately
      //    without waiting for a session so the menu loads with no flash.
      // Hardcoded fallback for Vercel preview builds where .env is gitignored.
      const fallbackId =
        import.meta.env.VITE_RESTAURANT_ID ||
        "44e1fea2-7260-43f8-9dc3-43066ad7acfc";
      return { status: "found", restaurantId: fallbackId };

      // 4. Session-first: logged-in owner's own restaurant takes priority on
      //    production domains where no env var is set.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const isSuperAdmin = session.user.app_metadata?.super_admin === true;
        if (!isSuperAdmin) {
          const { data } = await supabase
            .from("restaurant_settings")
            .select("id")
            .eq("owner_id", session.user.id)
            .maybeSingle();
          if (data?.id) return { status: "found", restaurantId: data.id };
        }
      }

      return { status: "root" };
    },
    staleTime: 5 * 60 * 1000,
  });

  const res: RestaurantResolution = isLoading
    ? { status: "loading" }
    : (resolution ?? { status: "root" });

  const restaurantId = res.status === "found" ? res.restaurantId : null;
  const isCustomDomainHost = hostResolution.type === "custom_domain" || hostResolution.type === "subdomain";

  return (
    <RestaurantContext.Provider value={{ resolution: res, restaurantId, isCustomDomainHost }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}

/** Use inside demo/isolated contexts where the restaurantId is known statically. */
export function StaticRestaurantProvider({ restaurantId, children }: { restaurantId: string; children: ReactNode }) {
  const value: RestaurantContextType = {
    resolution: { status: "found", restaurantId },
    restaurantId,
    isCustomDomainHost: false,
  };
  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}
