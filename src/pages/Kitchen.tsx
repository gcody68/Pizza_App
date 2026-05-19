import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import AdminLoginModal from "@/components/AdminLoginModal";
import KitchenAnalyticsBar from "@/components/KitchenAnalyticsBar";
import { useRestaurantSettings, isSalonBusiness, getBusinessDayWindow } from "@/hooks/useRestaurantSettings";
import { Check, Clock, Phone, User, ChefHat, Scissors, MessageSquare, RotateCcw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { useDemoMode } from "@/contexts/DemoModeContext";

const KDS_LAST_RESET_KEY = "kds_last_reset_date";

type OrderItem = {
  id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  special_instructions?: string | null;
};

type OrderWithItems = {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total: number;
  created_at: string;
  appointment_date: string | null;
  appointment_time: string | null;
  staff_id: string | null;
  staff_profiles: { name: string; color: string | null } | null;
  order_items: OrderItem[];
};

const DEMO_ORDERS_KEY = "gilded_demo_orders";

const SEED_ORDERS: DemoOrder[] = [
  {
    id: "SEED-042",
    customerName: "James Holloway",
    customerPhone: "(808) 555-0142",
    items: [
      { name: "Wagyu Burger", qty: 1, price: 28 },
      { name: "Garlic Fries", qty: 1, price: 9 },
      { name: "Iced Latte", qty: 2, price: 6 },
    ],
    total: 49,
    status: "new",
    time: "2 min ago",
    createdAt: Date.now() - 2 * 60 * 1000,
  },
  {
    id: "SEED-041",
    customerName: "Sofia Reyes",
    customerPhone: "(808) 555-0198",
    items: [
      { name: "Grilled Salmon", qty: 1, price: 34 },
      { name: "Caesar Salad", qty: 1, price: 14 },
    ],
    total: 48,
    status: "in-progress",
    time: "7 min ago",
    createdAt: Date.now() - 7 * 60 * 1000,
  },
];

function readOrdersFromStorage(): DemoOrder[] {
  try {
    const raw = localStorage.getItem(DEMO_ORDERS_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as DemoOrder[];
      // Keep seed order status changes; prepend real orders placed this session
      const realOrders = stored.filter((o) => !o.id.startsWith("SEED-"));
      const seedStatuses = Object.fromEntries(stored.filter((o) => o.id.startsWith("SEED-")).map((o) => [o.id, o.status]));
      const seeds = SEED_ORDERS.map((s) => seedStatuses[s.id] ? { ...s, status: seedStatuses[s.id] as DemoOrder["status"] } : s);
      return [...realOrders, ...seeds];
    }
  } catch {}
  return [...SEED_ORDERS];
}

type DemoOrder = import("@/contexts/DemoContext").DemoOrder;

// ---------------------------------------------------------------------------
// Demo kitchen board — reads orders directly from localStorage, no auth required
// ---------------------------------------------------------------------------
function DemoKitchenBoard() {
  const [orders, setOrders] = useState<DemoOrder[]>(() => readOrdersFromStorage());

  // Poll localStorage every 3s and listen for cross-tab storage events
  useEffect(() => {
    const sync = () => setOrders(readOrdersFromStorage());
    const interval = setInterval(sync, 3000);
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markReady = (id: string) => {
    const updated = orders.map((o) => o.id === id ? { ...o, status: "completed" as const } : o);
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(updated));
    setOrders(updated);
    toast.success("Order marked as ready!");
  };

  const pending = orders.filter((o) => o.status === "new" || o.status === "in-progress");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-gold" />
            <span className="font-serif text-lg font-semibold text-gold">Kitchen Display</span>
            <span className="text-xs text-amber-300/80 bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 rounded-full font-medium ml-1">
              Demo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{pending.length} pending</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </header>

      <KitchenAnalyticsBar businessHours={null} demoOrders={orders} />
      <div className="bg-amber-950/30 border-b border-amber-800/20 px-4 py-1.5 text-center">
        <p className="text-xs text-amber-400/60">Demo — stats reflect sample orders only. Live sales analytics available after sign-up.</p>
      </div>

      <div className="container py-6">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <ChefHat className="w-16 h-16 opacity-20" />
            <p className="text-lg">All orders fulfilled</p>
            <p className="text-sm">New orders from the demo menu appear here in real time</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pending.map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
                <div className="bg-secondary px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-gold font-bold text-sm">${Number(order.total).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="font-bold text-foreground text-base leading-tight">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="font-bold text-foreground text-base tracking-wide">{order.customerPhone}</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-baseline">
                      <span className="text-foreground font-semibold text-sm">
                        <span className="text-gold font-bold text-base mr-1.5">{item.qty}×</span>
                        {item.name}
                      </span>
                      <span className="text-muted-foreground text-xs">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <Button
                    onClick={() => markReady(order.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-10"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Ready
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real kitchen board — requires Supabase auth
// ---------------------------------------------------------------------------
const urlResId = new URLSearchParams(window.location.search).get("res_id");

function KitchenBoard() {
  const { isAdmin, authLoading, session } = useAdmin();
  const qc = useQueryClient();
  const dailyResetDone = useRef(false);

  // Always resolve via the logged-in owner — never trust a URL param for kitchen auth.
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ["kitchen-restaurant", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from("restaurant_settings")
        .select("id, business_name, business_hours")
        .eq("owner_id", session.user.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const restaurantId = restaurant?.id ?? null;
  const restaurantName = restaurant?.business_name ?? null;
  const businessHours = (restaurant?.business_hours ?? null) as import("@/hooks/useRestaurantSettings").BusinessHours | null;
  const { data: restaurantSettings } = useRestaurantSettings(restaurantId);
  const isSalon = isSalonBusiness(restaurantSettings);

  const { data: rawOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["kitchen-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), staff_profiles(name, color)")
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as OrderWithItems[];
    },
    refetchInterval: 5000,
    enabled: !!restaurantId,
  });

  // For salon: sort appointments chronologically by date + time slot
  const orders = isSalon && rawOrders
    ? [...rawOrders].sort((a, b) => {
        const aKey = `${a.appointment_date ?? "9999"} ${a.appointment_time ?? ""}`;
        const bKey = `${b.appointment_date ?? "9999"} ${b.appointment_time ?? ""}`;
        return aKey.localeCompare(bKey);
      })
    : rawOrders;

  // Daily reset: on first load each day, mark any leftover "pending" orders as completed
  useEffect(() => {
    if (!restaurantId || dailyResetDone.current) return;
    const today = new Date().toISOString().split("T")[0];
    const lastReset = localStorage.getItem(KDS_LAST_RESET_KEY);
    if (lastReset === today) { dailyResetDone.current = true; return; }

    (async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending")
        .lt("created_at", yesterday.toISOString());

      if (!error) {
        localStorage.setItem(KDS_LAST_RESET_KEY, today);
        dailyResetDone.current = true;
        qc.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
        toast.success("Kitchen slate cleared for today's service.", { duration: 3000 });
      }
    })();
  }, [restaurantId, qc]);

  // Realtime subscription filtered by restaurantId
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        console.log("[Kitchen] realtime INSERT:", payload.new);
        qc.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
        toast("New order received!", { description: `From ${(payload.new as { customer_name?: string }).customer_name ?? "customer"}` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, () => {
        qc.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
      })
      .subscribe((status) => console.log("[Kitchen] realtime:", status));
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, qc]);

  const markReady = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
      toast.success("Order marked as ready!");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AdminLoginModal open={true} onClose={() => {}} />
        <div className="text-center space-y-4">
          {isSalon ? <Scissors className="w-16 h-16 text-gold mx-auto" /> : <ChefHat className="w-16 h-16 text-gold mx-auto" />}
          <h1 className="text-2xl font-serif font-bold text-foreground">{isSalon ? "Stylist Dashboard" : "Kitchen Display"}</h1>
          <p className="text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  const allLoading = restaurantLoading || ordersLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            {isSalon ? <Scissors className="w-5 h-5 text-gold" /> : <ChefHat className="w-5 h-5 text-gold" />}
            <span className="font-serif text-lg font-semibold text-gold">
              {isSalon ? "Stylist Dashboard" : "Kitchen Display"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {orders?.length || 0} {isSalon ? "upcoming" : "pending"}
            </span>
            <button
              onClick={async () => {
                if (!restaurantId) return;
                const { error } = await supabase
                  .from("orders")
                  .update({ status: "completed" })
                  .eq("restaurant_id", restaurantId)
                  .eq("status", "pending");
                if (!error) {
                  qc.invalidateQueries({ queryKey: ["kitchen-orders", restaurantId] });
                  toast.success(isSalon ? "Schedule cleared!" : "Board cleared!");
                }
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary transition-colors"
              title={isSalon ? "Clear all appointments" : "Clear all pending orders"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      </header>

      <KitchenAnalyticsBar businessHours={businessHours} restaurantId={restaurantId} />

      <div className="container py-6">
        {allLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            {isSalon ? <Scissors className="w-16 h-16 opacity-20" /> : <ChefHat className="w-16 h-16 opacity-20" />}
            <p className="text-lg">{isSalon ? "No upcoming appointments" : "No pending orders"}</p>
            <p className="text-sm">{isSalon ? "New bookings will appear here automatically" : "New orders will appear here automatically"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders?.map((order) => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in"
              >
                <div className="bg-secondary px-4 py-3 border-b border-border">
                  {isSalon && (order.appointment_date || order.appointment_time) ? (
                    <div className="mb-3">
                      {order.appointment_date && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <CalendarDays className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                          <span className="text-sm font-bold text-gold">
                            {format(parseISO(order.appointment_date), "EEE, MMM d")}
                          </span>
                        </div>
                      )}
                      {order.appointment_time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                          <span className="text-base font-bold text-foreground">{order.appointment_time}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="text-gold font-bold text-sm">${Number(order.total).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="font-bold text-foreground text-base leading-tight">{order.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="font-bold text-foreground text-base tracking-wide">{order.customer_phone}</span>
                  </div>
                  {isSalon && (
                    <div className="mt-2 flex items-center justify-between">
                      {order.staff_profiles ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: order.staff_profiles.color ?? "#C9A84C" }}
                          />
                          <span className="text-xs font-semibold text-foreground">{order.staff_profiles.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                      <span className="text-gold font-bold text-sm">${Number(order.total).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {order.order_items.map((oi) => (
                    <div key={oi.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-foreground font-semibold text-sm">
                          <span className="text-gold font-bold text-base mr-1.5">{oi.quantity}×</span>
                          {oi.menu_item_name}
                        </span>
                        <span className="text-muted-foreground text-xs">${(oi.price * oi.quantity).toFixed(2)}</span>
                      </div>
                      {oi.special_instructions && (
                        <div className="flex items-start gap-1.5 ml-5 bg-gold/10 border border-gold/20 rounded-md px-2 py-1">
                          <MessageSquare className="w-3 h-3 text-gold mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-semibold text-foreground leading-relaxed">{oi.special_instructions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-4 pb-4 pt-1 border-t border-border">
                  <Button
                    onClick={() => markReady.mutate(order.id)}
                    disabled={markReady.isPending}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm h-10"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isSalon ? "Mark as Complete" : "Mark as Ready"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const demo = useDemoMode();

  if (demo) {
    return <DemoKitchenBoard />;
  }

  return (
    <AdminProvider>
      <KitchenBoard />
    </AdminProvider>
  );
}
