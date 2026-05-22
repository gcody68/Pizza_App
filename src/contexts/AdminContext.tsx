import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AdminContextType = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  authLoading: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, restaurantName: string) => Promise<{ error: string | null }>;
  logout: () => void;
};

const AdminContext = createContext<AdminContextType | null>(null);

// Allows the demo page to inject a fake admin context without touching AdminProvider
const DemoAdminOverrideContext = createContext<AdminContextType | null>(null);

export function DemoAdminProvider({
  children,
  onLogout,
  onLogin,
  isAdmin = true,
}: {
  children: ReactNode;
  onLogout: () => void;
  onLogin?: () => void;
  isAdmin?: boolean;
}) {
  const value: AdminContextType = {
    isAdmin,
    isSuperAdmin: false,
    authLoading: false,
    session: null,
    login: async () => { onLogin?.(); return { error: null }; },
    signUp: async () => { onLogin?.(); return { error: null }; },
    logout: onLogout,
  };
  return (
    <DemoAdminOverrideContext.Provider value={value}>
      {children}
    </DemoAdminOverrideContext.Provider>
  );
}

// When the shop is opened via ?test_res_id (Admin "Open My Shop" button), the shared
// auth session must not bleed into admin mode — the tab is a customer view.
const isTestShopMode = new URLSearchParams(window.location.search).has("test_res_id");

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // BETA TESTING: auth bypassed — skip login requirement
    setIsAdmin(true);
    setIsSuperAdmin(false);
    setAuthLoading(false);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      await supabase
        .from("restaurant_settings")
        .update({ owner_id: data.session.user.id })
        .is("owner_id", null);
      // Ensure the user has a restaurant_settings record
      const { data: existing } = await supabase
        .from("restaurant_settings")
        .select("id")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("restaurant_settings").insert({
          business_name: data.session.user.user_metadata?.restaurant_name ?? "My Restaurant",
          owner_id: data.session.user.id,
        });
      }
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, restaurantName: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { restaurant_name: restaurantName } },
    });
    if (error) return { error: error.message };
    if (data.session) {
      await supabase.from("restaurant_settings").insert({
        business_name: restaurantName,
        owner_id: data.session.user.id,
      });
    }
    return { error: null };
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  return (
    <AdminContext.Provider value={{ isAdmin, isSuperAdmin, authLoading, session, login, signUp, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  // Demo override takes precedence when present
  const demoCtx = useContext(DemoAdminOverrideContext);
  if (demoCtx) return demoCtx;
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
