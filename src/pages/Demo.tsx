import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { DemoProvider, useDemo } from "@/contexts/DemoContext";
import { DemoAdminProvider } from "@/contexts/AdminContext";
import { DemoModeProvider, type DemoModeContextType } from "@/contexts/DemoModeContext";
import { StaticRestaurantProvider } from "@/contexts/RestaurantContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setImageUploadDemoMode } from "@/hooks/useImageUpload";
import { applyTheme, getThemeById } from "@/lib/themes";
import { applyBgStyle, getBgStyleById } from "@/components/BackgroundStyleSelector";
import { RotateCcw, Database, Eye, EyeOff, ArrowLeft, ShoppingBag, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemoryRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Index from "@/pages/Index";
import Kitchen from "@/pages/Kitchen";
import type { GalleryItem } from "@/hooks/useGallery";
import type { RestaurantSettings } from "@/hooks/useRestaurantSettings";
import type { MenuItem } from "@/hooks/useMenuItems";

const GOLD = "#c9a84c";
const SESSION_KEY = "loomis_sandbox_authed";

// ─── Login gate ───────────────────────────────────────────────────────────────

function DemoLoginGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === "test" && password === "test") {
      sessionStorage.setItem(SESSION_KEY, "1");
      onAuthenticated();
    } else {
      setError("Invalid credentials. Try username: test / password: test");
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #1a1208, #0a0d10, #0d1010)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.18) 0%, transparent 60%)` }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.12)", border: `1px solid rgba(201,168,76,0.25)` }}
          >
            <span className="font-bold text-lg" style={{ color: GOLD }}>L</span>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl tracking-tight">Loomis HQ</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Sandbox Demo Environment</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-7 shadow-2xl"
          style={{ background: "#131e30", border: "1px solid rgba(201,168,76,0.15)" }}
        >
          <h2 className="text-white font-semibold text-base mb-1">Sign in to Demo</h2>
          <p className="text-xs mb-6" style={{ color: "#6b7280" }}>
            Use{" "}
            <span style={{ color: GOLD }} className="font-semibold">test</span>
            {" / "}
            <span style={{ color: GOLD }} className="font-semibold">test</span>
            {" "}to access the sandbox.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Username</Label>
              <Input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="test"
                autoFocus
                autoComplete="off"
                className="h-10 text-sm text-white placeholder:text-neutral-600"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" style={{ color: "#9ca3af" }}>Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••"
                  className="h-10 text-sm text-white placeholder:text-neutral-600 pr-10"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6b7280" }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold"
              style={{ background: GOLD, color: "#111" }}
            >
              Enter Demo
            </Button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: "#374151" }}>
            No data is sent to any server in this environment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Demo banner ──────────────────────────────────────────────────────────────

function DemoBanner({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="sticky top-0 z-[60] flex items-center justify-between gap-4 px-4 py-2 text-xs font-medium"
      style={{
        background: "linear-gradient(90deg, #3d1f08 0%, #2a1a08 50%, #3d1f08 100%)",
        borderBottom: `1px solid rgba(201,168,76,0.3)`,
      }}
    >
      <a
        href="https://loomis-hq.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all"
        style={{
          background: "rgba(201,168,76,0.12)",
          border: "1px solid rgba(201,168,76,0.35)",
          color: GOLD,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.22)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.7)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.12)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.35)";
        }}
        title="Go to Loomis HQ"
      >
        <img src="/image.png" alt="Loomis HQ" className="h-5 w-auto brightness-200" />
        <span className="hidden sm:inline text-xs font-semibold" style={{ color: GOLD, letterSpacing: "0.02em" }}>
          loomis-hq.com
        </span>
      </a>
      <div className="flex items-center gap-2 flex-1 justify-center">
        <Database className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
        <span style={{ color: "rgba(201,168,76,0.85)" }}>
          Demo Mode — data stored in browser only, never sent to any server
        </span>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-1 flex-shrink-0 transition-colors"
        style={{ color: "rgba(201,168,76,0.55)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(201,168,76,0.55)")}
        title="Reset demo to defaults"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
  );
}

// ─── Subpage back-bar (shown on /menu and /kitchen) ─────────────────────────

function DemoSubpageLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isKitchen = location.pathname === "/kitchen";
  const isMenu = location.pathname === "/menu";

  const backBar = (
    <div
      className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
      style={{
        background: "rgba(0,0,0,0.72)",
        borderBottom: "1px solid rgba(201,168,76,0.2)",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 55,
      }}
    >
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-xs font-semibold transition-colors rounded-md px-3 py-1.5 flex-shrink-0"
        style={{ color: GOLD, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.18)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.1)"; }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Dashboard
      </button>

      <div className="flex items-center gap-1.5 min-w-0">
        {isKitchen
          ? <ChefHat className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
          : <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />}
        <span className="text-xs font-medium truncate" style={{ color: "rgba(201,168,76,0.7)" }}>
          {isKitchen
            ? "Kitchen Display — orders from customers appear here in real time"
            : "Customer View — add items to cart and place a test order"}
        </span>
      </div>
    </div>
  );

  // /menu must render with isAdmin=false so customers see Add-to-Order buttons, not Edit overlays
  if (isMenu) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {backBar}
        <DemoAdminProvider onLogout={() => {}} isAdmin={false}>
          <div className="flex-1">
            <Outlet />
          </div>
        </DemoAdminProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {backBar}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

// ─── Demo shell wrapping the real Dashboard ───────────────────────────────────

function DemoShell() {
  const {
    settings,
    menuItems,
    updateSettings,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    clearMenuItems,
    loadSampleMenu,
    resetDemo,
    addDemoOrder,
  } = useDemo();

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // Always-current refs so closures in demoMode never capture stale values
  const settingsRef = useRef(settings);
  const menuItemsRef = useRef(menuItems);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { menuItemsRef.current = menuItems; }, [menuItems]);

  useEffect(() => {
    setImageUploadDemoMode(true);
    return () => setImageUploadDemoMode(false);
  }, []);

  useEffect(() => {
    applyBgStyle(getBgStyleById((settings.bg_style as string) ?? "forest-dark"));
    applyTheme(getThemeById((settings.theme as string) ?? "sunwashed-citrus"));
  }, [settings.theme, settings.bg_style]);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity,
            gcTime: Infinity,
            retry: false,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  // Pre-populate query cache for all key variants hooks might use.
  // "demo" is the canonical restaurantId in demo mode (from StaticRestaurantProvider).
  useEffect(() => {
    const rs: RestaurantSettings = { ...settings };
    queryClient.setQueryData(["restaurant-settings", "demo"], rs);
    queryClient.setQueryData(["restaurant-settings", "owner"], rs);
    queryClient.setQueryData(["restaurant-settings", undefined], rs);
    queryClient.setQueryData(["restaurant-settings", null], rs);
  }, [settings, queryClient]);

  useEffect(() => {
    queryClient.setQueryData(["menu-items", "demo"], menuItems);
    queryClient.setQueryData(["menu-items", "owner"], menuItems);
    queryClient.setQueryData(["menu-items", undefined], menuItems);
    queryClient.setQueryData(["menu-items", null], menuItems);
  }, [menuItems, queryClient]);

  useEffect(() => {
    queryClient.setQueryData(["gallery-items", "demo"], galleryItems);
    queryClient.setQueryData(["gallery-items", "owner"], galleryItems);
    queryClient.setQueryData(["gallery-items", undefined], galleryItems);
    queryClient.setQueryData(["gallery-items", null], galleryItems);
  }, [galleryItems, queryClient]);

  const demoMode = useMemo<DemoModeContextType>(
    () => ({
      isDemo: true,
      updateSettings,
      getSettings: () => ({ ...settingsRef.current } as RestaurantSettings),
      getMenuItems: () => menuItemsRef.current,
      createMenuItem: (item) => createMenuItem({ ...item, restaurant_id: null } as Parameters<typeof createMenuItem>[0]),
      upsertMenuItem: (id, updates) => {
        updateMenuItem(id, updates);
        queryClient.setQueryData(
          ["menu-items", "owner"],
          (prev: MenuItem[] | undefined) =>
            (prev ?? []).map((m) => (m.id === id ? { ...m, ...updates } : m))
        );
      },
      deleteMenuItem: (id) => {
        deleteMenuItem(id);
        queryClient.setQueryData(
          ["menu-items", "owner"],
          (prev: MenuItem[] | undefined) => (prev ?? []).filter((m) => m.id !== id)
        );
      },
      clearMenuItems: () => {
        clearMenuItems();
        queryClient.setQueryData(["menu-items", "owner"], []);
      },
      loadSampleMenu: () => {
        loadSampleMenu();
      },
      decrementStock: (items) => {
        items.forEach(({ id, quantity }) => {
          updateMenuItem(id, {
            daily_stock: Math.max(
              0,
              (menuItemsRef.current.find((m) => m.id === id)?.daily_stock ?? 0) - quantity
            ),
          });
        });
      },
      getGalleryItems: () => galleryItems,
      addGalleryItem: (item) => {
        const newItem: GalleryItem = {
          id: `demo-gallery-${Date.now()}`,
          restaurant_id: null,
          image_url: item.image_url,
          caption: item.caption ?? null,
          sort_order: Date.now(),
          created_at: new Date().toISOString(),
        };
        setGalleryItems((prev) => [...prev, newItem]);
      },
      deleteGalleryItem: (id) => {
        setGalleryItems((prev) => prev.filter((g) => g.id !== id));
      },
      submitOrder: (payload) => {
        addDemoOrder({
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          items: payload.items,
          total: payload.total,
        });
      },
    }),
    [galleryItems, updateSettings, createMenuItem, updateMenuItem, deleteMenuItem, clearMenuItems, loadSampleMenu, addDemoOrder, queryClient]
  );

  const handleReset = useCallback(() => {
    resetDemo();
    queryClient.clear();
    toast.success("Demo reset to defaults.");
  }, [resetDemo, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <DemoModeProvider value={demoMode}>
        <DemoAdminProvider
          onLogout={() => { /* no-op in demo */ }}
          onLogin={() => { /* no-op in demo */ }}
          isAdmin={true}
        >
          <div className="flex flex-col min-h-screen">
            <DemoBanner onReset={handleReset} />
            {/* MemoryRouter + RestaurantProvider are needed by Dashboard internals.
                DemoModeProvider intercepts all hooks so no Supabase calls happen.
                Dashboard renders its own CartProvider internally. */}
            <MemoryRouter initialEntries={["/dashboard"]}>
              <StaticRestaurantProvider restaurantId="demo">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route element={<DemoSubpageLayout />}>
                    <Route path="/menu" element={<Index />} />
                    <Route path="/kitchen" element={<Kitchen />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </StaticRestaurantProvider>
            </MemoryRouter>
          </div>
        </DemoAdminProvider>
      </DemoModeProvider>
    </QueryClientProvider>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function Demo() {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });

  if (!authed) return <DemoLoginGate onAuthenticated={() => setAuthed(true)} />;

  return (
    <DemoProvider>
      <DemoShell />
    </DemoProvider>
  );
}
