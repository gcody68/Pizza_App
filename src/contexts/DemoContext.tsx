import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import type { MenuItem, MealPeriod } from "@/hooks/useMenuItems";
import type { RestaurantSettings } from "@/hooks/useRestaurantSettings";
import { DEFAULT_SERVICE_HOURS, DEFAULT_BUSINESS_HOURS } from "@/hooks/useRestaurantSettings";
import { STARTER_ITEMS } from "@/components/StarterContent";
import { supabase } from "@/integrations/supabase/client";

const DEMO_GUEST_ID_KEY = "gilded_demo_guest_id";
const DEMO_MENU_KEY = "gilded_demo_menu_v2";
const DEMO_SETTINGS_KEY = "gilded_demo_settings";
const DEMO_ORDERS_KEY = "gilded_demo_orders";

// Clear stale keys from old versions
["gilded_demo_menu"].forEach((k) => {
  try { localStorage.removeItem(k); } catch {}
});


function generateGuestId(): string {
  return `guest_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function getOrCreateGuestId(): string {
  const existing = localStorage.getItem(DEMO_GUEST_ID_KEY);
  if (existing) return existing;
  const id = generateGuestId();
  localStorage.setItem(DEMO_GUEST_ID_KEY, id);
  return id;
}

const DEFAULT_DEMO_SETTINGS: RestaurantSettings = {
  id: "demo",
  owner_id: null,
  business_name: "Loomis Salon",
  business_address: "1234 Main Street, Springfield, IL 62701",
  business_phone: "(217) 555-0142",
  header_image_url: "https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images/Header_Image.png",
  logo_url: null,
  theme: "neon-night",
  bg_style: "medium-steel",
  payment_enabled: false,
  stripe_public_key: null,
  stripe_secret_key: null,
  kitchen_view_enabled: true,
  show_gallery: true,
  service_hours: DEFAULT_SERVICE_HOURS,
  business_hours: DEFAULT_BUSINESS_HOURS,
  unavailable_display: "hide",
  subdomain: null,
  custom_domain: null,
};

function buildDefaultMenuItems(): MenuItem[] {
  return STARTER_ITEMS.map((item, i) => ({
    id: `demo-item-${i}`,
    name: item.name,
    description: item.description,
    price: item.price,
    image_url: item.image_url,
    sort_order: item.sort_order ?? i * 10,
    is_placeholder: false,
    category: item.category,
    meal_period: item.meal_period,
    is_available: true,
    daily_stock: null,
    duration_minutes: item.duration_minutes ?? null,
  }));
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export type DemoStep = "branding" | "menu" | "ordering";

export type DemoOrderItem = {
  name: string;
  qty: number;
  price: number;
};

export type DemoOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  items: DemoOrderItem[];
  total: number;
  status: "new" | "in-progress" | "ready" | "completed";
  time: string;
  createdAt: number;
};

type DemoContextType = {
  guestId: string;
  menuItems: MenuItem[];
  settings: RestaurantSettings;
  isAdmin: boolean;
  setIsAdmin: (v: boolean) => void;
  updateSettings: (updates: Partial<RestaurantSettings>) => void;
  createMenuItem: (item: Omit<MenuItem, "id" | "sort_order" | "is_placeholder">) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  clearMenuItems: () => void;
  resetDemo: () => void;
  loadSampleMenu: () => void;
  completedSteps: Set<DemoStep>;
  markStepComplete: (step: DemoStep) => void;
  syncPulse: boolean;
  phoneHighlight: boolean;
  demoOrders: DemoOrder[];
  addDemoOrder: (order: Omit<DemoOrder, "id" | "time" | "createdAt" | "status">) => void;
  updateDemoOrderStatus: (id: string, status: DemoOrder["status"]) => void;
};

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const guestId = getOrCreateGuestId();

  // Start with localStorage (or hardcoded fallback), then immediately refresh from DB
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    loadFromStorage<MenuItem[]>(DEMO_MENU_KEY, buildDefaultMenuItems())
  );

  // On mount, always fetch the latest demo menu from DB to replace any stale cache
  useEffect(() => {
    supabase
      .from("demo_menu_items" as never)
      .select("name, description, price, category, meal_period, image_url, sort_order")
      .order("sort_order")
      .then(({ data, error }) => {
        if (data && !error && (data as typeof STARTER_ITEMS).length > 0) {
          const fresh: MenuItem[] = (data as typeof STARTER_ITEMS).map((item, i) => ({
            id: `demo-item-${i}`,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            sort_order: item.sort_order ?? i * 10,
            is_placeholder: false,
            category: item.category,
            meal_period: item.meal_period as MealPeriod,
            is_available: true,
            daily_stock: null,
          }));
          setMenuItems(fresh);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [settings, setSettings] = useState<RestaurantSettings>(() =>
    loadFromStorage<RestaurantSettings>(DEMO_SETTINGS_KEY, DEFAULT_DEMO_SETTINGS)
  );
  const [isAdmin, setIsAdmin] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<DemoStep>>(new Set());
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>(() =>
    loadFromStorage<DemoOrder[]>(DEMO_ORDERS_KEY, [])
  );
  const [syncPulse, setSyncPulse] = useState(false);
  const [phoneHighlight, setPhoneHighlight] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveToStorage(DEMO_MENU_KEY, menuItems);
  }, [menuItems]);

  useEffect(() => {
    saveToStorage(DEMO_SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    saveToStorage(DEMO_ORDERS_KEY, demoOrders);
  }, [demoOrders]);

  // Sync orders across tabs (e.g. kitchen tab picks up orders placed in demo tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === DEMO_ORDERS_KEY && e.newValue) {
        try {
          setDemoOrders(JSON.parse(e.newValue) as DemoOrder[]);
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const triggerSync = useCallback(() => {
    setSyncPulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setSyncPulse(false), 1200);
  }, []);

  const triggerHighlight = useCallback(() => {
    setPhoneHighlight(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setPhoneHighlight(false), 1000);
  }, []);

  const updateSettings = useCallback((updates: Partial<RestaurantSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    triggerSync();
    if (updates.theme || updates.bg_style) {
      triggerHighlight();
    }
    if (updates.business_name || updates.header_image_url) {
      setCompletedSteps((prev) => new Set([...prev, "branding" as DemoStep]));
    }
  }, [triggerSync, triggerHighlight]);

  const createMenuItem = useCallback((item: Omit<MenuItem, "id" | "sort_order" | "is_placeholder">) => {
    const newItem: MenuItem = {
      ...item,
      id: `demo-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sort_order: Date.now(),
      is_placeholder: false,
    };
    setMenuItems((prev) => [...prev, newItem]);
    triggerSync();
    setCompletedSteps((prev) => new Set([...prev, "menu" as DemoStep]));
  }, [triggerSync]);

  const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setMenuItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    triggerSync();
  }, [triggerSync]);

  const deleteMenuItem = useCallback((id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
    triggerSync();
  }, [triggerSync]);

  const clearMenuItems = useCallback(() => {
    setMenuItems([]);
    triggerSync();
  }, [triggerSync]);

  const loadSampleMenu = useCallback(() => {
    supabase
      .from("demo_menu_items" as never)
      .select("name, description, price, category, meal_period, image_url, sort_order")
      .order("sort_order")
      .then(({ data, error }) => {
        const source = (data && !error && (data as typeof STARTER_ITEMS).length > 0)
          ? (data as typeof STARTER_ITEMS)
          : STARTER_ITEMS;
        const fresh: MenuItem[] = source.map((item, i) => ({
          id: `demo-item-${i}`,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          sort_order: item.sort_order ?? i * 10,
          is_placeholder: false,
          category: item.category,
          meal_period: item.meal_period as MealPeriod,
          is_available: true,
          daily_stock: null,
        }));
        setMenuItems(fresh);
        triggerSync();
        triggerHighlight();
        setCompletedSteps((prev) => new Set([...prev, "menu" as DemoStep]));
      });
  }, [triggerSync, triggerHighlight]);

  const markStepComplete = useCallback((step: DemoStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const addDemoOrder = useCallback((order: Omit<DemoOrder, "id" | "time" | "createdAt" | "status">) => {
    const newOrder: DemoOrder = {
      ...order,
      id: `ORD-${String(Math.floor(Math.random() * 900) + 100)}`,
      status: "new",
      time: "just now",
      createdAt: Date.now(),
    };
    setDemoOrders((prev) => {
      const updated = [newOrder, ...prev];
      // Write immediately so storage event fires in kitchen tab before next render
      saveToStorage(DEMO_ORDERS_KEY, updated);
      return updated;
    });
    triggerSync();
    setCompletedSteps((prev) => new Set([...prev, "ordering" as DemoStep]));
  }, [triggerSync]);

  const updateDemoOrderStatus = useCallback((id: string, status: DemoOrder["status"]) => {
    setDemoOrders((prev) => {
      const updated = prev.map((o) => o.id === id ? { ...o, status } : o);
      saveToStorage(DEMO_ORDERS_KEY, updated);
      return updated;
    });
  }, []);

  const resetDemo = useCallback(() => {
    setMenuItems(buildDefaultMenuItems());
    setSettings(DEFAULT_DEMO_SETTINGS);
    setCompletedSteps(new Set());
    setDemoOrders([]);
    localStorage.removeItem(DEMO_MENU_KEY);
    localStorage.removeItem(DEMO_SETTINGS_KEY);
    localStorage.removeItem(DEMO_GUEST_ID_KEY);
    localStorage.removeItem(DEMO_ORDERS_KEY);
    // Re-fetch fresh menu from DB after reset
    supabase
      .from("demo_menu_items" as never)
      .select("name, description, price, category, meal_period, image_url, sort_order")
      .order("sort_order")
      .then(({ data, error }) => {
        if (data && !error && (data as typeof STARTER_ITEMS).length > 0) {
          setMenuItems((data as typeof STARTER_ITEMS).map((item, i) => ({
            id: `demo-item-${i}`,
            name: item.name,
            description: item.description,
            price: item.price,
            image_url: item.image_url,
            sort_order: item.sort_order ?? i * 10,
            is_placeholder: false,
            category: item.category,
            meal_period: item.meal_period as MealPeriod,
            is_available: true,
            daily_stock: null,
          })));
        }
      });
  }, []);

  return (
    <DemoContext.Provider value={{
      guestId,
      menuItems,
      settings,
      isAdmin,
      setIsAdmin,
      updateSettings,
      createMenuItem,
      updateMenuItem,
      deleteMenuItem,
      clearMenuItems,
      resetDemo,
      loadSampleMenu,
      completedSteps,
      markStepComplete,
      syncPulse,
      phoneHighlight,
      demoOrders,
      addDemoOrder,
      updateDemoOrderStatus,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
