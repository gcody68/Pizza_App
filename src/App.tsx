import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RestaurantProvider, useRestaurant } from "@/contexts/RestaurantContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Index from "./pages/Index.tsx";
import Kitchen from "./pages/Kitchen.tsx";
import Demo from "./pages/Demo.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import CalendarBooking from "./pages/CalendarBooking.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import ImpersonationBanner from "@/components/ImpersonationBanner";

const DEMO_HOSTNAMES = ["demo.loomis-hq.com", "demo.loomishq.com"];

const queryClient = new QueryClient();

function RootRoute() {
  const { resolution, isCustomDomainHost } = useRestaurant();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still resolving restaurant identity
  if (resolution.status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  // Restaurant found → show the menu
  if (resolution.status === "found") return <Index />;

  // On a customer's custom domain/subdomain: restaurant not found → send to login.
  if (isCustomDomainHost) {
    return <Navigate to="/admin" replace />;
  }

  // BETA TESTING: skip login, go straight to dashboard
  return <Navigate to="/dashboard" replace />;
}

const App = () => {
  // demo.loomis-hq.com bypasses RestaurantProvider entirely so it never
  // queries real restaurant data from Supabase.
  if (DEMO_HOSTNAMES.includes(window.location.hostname)) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Demo />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ImpersonationBanner />
        <BrowserRouter>
          <RestaurantProvider>
            <Routes>
              {/* Named routes always take priority — never intercepted by restaurant resolution */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Login />} />
              <Route path="/calendar" element={<CalendarBooking />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/" element={<RootRoute />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RestaurantProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
