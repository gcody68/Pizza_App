import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessDayWindow, type BusinessHours } from "@/hooks/useRestaurantSettings";
import { Eye, EyeOff, TrendingUp, ShoppingBag, Star, Receipt } from "lucide-react";
import type { DemoOrder } from "@/contexts/DemoContext";

type DailyStats = {
  grossSales: number;
  orderCount: number;
  avgTicket: number;
  topItem: string | null;
};

async function fetchDailyStats(businessHours: BusinessHours | null, restaurantId: string | null): Promise<DailyStats> {
  const { start, end } = getBusinessDayWindow(businessHours);

  let query = supabase
    .from("orders")
    .select("id, total")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);

  const { data: ordersData, error: ordersError } = await query;

  if (ordersError) throw ordersError;

  const grossSales = (ordersData || []).reduce((sum, o) => sum + Number(o.total), 0);
  const orderCount = (ordersData || []).length;
  const avgTicket = orderCount > 0 ? grossSales / orderCount : 0;

  const orderIds = (ordersData || []).map((o) => o.id);

  let topItem: string | null = null;

  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("menu_item_name, quantity")
      .in("order_id", orderIds);

    if (itemsData && itemsData.length > 0) {
      const counts: Record<string, number> = {};
      itemsData.forEach((item) => {
        counts[item.menu_item_name] = (counts[item.menu_item_name] || 0) + item.quantity;
      });
      topItem = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
  }

  return { grossSales, orderCount, avgTicket, topItem };
}

function computeDemoStats(orders: DemoOrder[]): DailyStats {
  const active = orders.filter((o) => o.status !== "completed");
  const grossSales = active.reduce((sum, o) => sum + o.total, 0);
  const orderCount = active.length;
  const avgTicket = orderCount > 0 ? grossSales / orderCount : 0;

  const counts: Record<string, number> = {};
  active.forEach((o) => o.items.forEach((i) => {
    counts[i.name] = (counts[i.name] || 0) + i.qty;
  }));
  const topItem = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { grossSales, orderCount, avgTicket, topItem };
}

type Props = {
  businessHours: BusinessHours | null;
  restaurantId?: string | null;
  demoOrders?: DemoOrder[];
};

export default function KitchenAnalyticsBar({ businessHours, restaurantId, demoOrders }: Props) {
  const isDemo = demoOrders !== undefined;

  const [stats, setStats] = useState<DailyStats>(() =>
    isDemo ? computeDemoStats(demoOrders!) : { grossSales: 0, orderCount: 0, avgTicket: 0, topItem: null }
  );
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(!isDemo);

  // Demo mode: recompute from prop changes
  useEffect(() => {
    if (isDemo) setStats(computeDemoStats(demoOrders!));
  }, [isDemo, demoOrders]);

  const refresh = useCallback(async () => {
    if (isDemo) return;
    try {
      const data = await fetchDailyStats(businessHours, restaurantId ?? null);
      setStats(data);
    } catch {
      // silent fail — stats are non-critical
    } finally {
      setLoading(false);
    }
  }, [isDemo, businessHours, restaurantId]);

  useEffect(() => {
    if (isDemo) return;
    refresh();

    const channel = supabase
      .channel("kitchen-analytics-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => { refresh(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDemo, refresh]);

  const fmt = (val: number) =>
    hidden ? "••••" : `$${val.toFixed(2)}`;

  return (
    <div className="w-full bg-[#0f0f0f] border-b border-[#2a2218]">
      <div className="container flex items-center gap-3 py-2.5 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <span className="text-xs font-semibold text-[#a08040] uppercase tracking-widest">Today</span>
        </div>

        <div className="flex items-center gap-2 bg-[#1a1a14] border border-[#2e2618] rounded-lg px-3 py-1.5 min-w-[110px]">
          <Receipt className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#7a6a3a] uppercase tracking-wider leading-none mb-0.5">Gross Sales</p>
            <p className="text-sm font-bold text-[#e8c96a] leading-none">
              {loading ? <span className="opacity-40">—</span> : fmt(stats.grossSales)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1a1a14] border border-[#2e2618] rounded-lg px-3 py-1.5 min-w-[100px]">
          <ShoppingBag className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#7a6a3a] uppercase tracking-wider leading-none mb-0.5">Orders</p>
            <p className="text-sm font-bold text-white leading-none">
              {loading ? <span className="opacity-40">—</span> : stats.orderCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1a1a14] border border-[#2e2618] rounded-lg px-3 py-1.5 min-w-[120px]">
          <TrendingUp className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
          <div>
            <p className="text-[10px] text-[#7a6a3a] uppercase tracking-wider leading-none mb-0.5">Avg Ticket</p>
            <p className="text-sm font-bold text-[#e8c96a] leading-none">
              {loading ? <span className="opacity-40">—</span> : fmt(stats.avgTicket)}
            </p>
          </div>
        </div>

        {stats.topItem && (
          <div className="flex items-center gap-2 bg-[#1a1208] border border-[#3a2c10] rounded-lg px-3 py-1.5 flex-1 min-w-[160px] max-w-xs">
            <Star className="w-3.5 h-3.5 text-[#e8c96a] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-[#7a6a3a] uppercase tracking-wider leading-none mb-0.5">Bestseller Today</p>
              <p className="text-xs font-semibold text-[#e8c96a] leading-none truncate">
                {hidden ? "••••••••" : stats.topItem}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setHidden((h) => !h)}
          className="ml-auto flex items-center gap-1.5 text-[#5a4a2a] hover:text-[#a08040] transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-[#1a1a14]"
          title={hidden ? "Show amounts" : "Hide amounts"}
        >
          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{hidden ? "Show" : "Hide"}</span>
        </button>
      </div>
    </div>
  );
}
