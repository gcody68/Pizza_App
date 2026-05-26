import { useState, useMemo } from "react";
import { useRestaurantSettings, useUpdateSettings } from "@/hooks/useRestaurantSettings";
import { useShiftLogs, useStaff, type ShiftLog } from "@/hooks/useStaff";
import {
  CreditCard, Banknote, TrendingUp, Download, Mail, ChevronDown,
  Loader as Loader2, ArrowUpRight, ExternalLink, Scissors, ShoppingBag, Info, Clock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface DayRow {
  date: string;
  card_total: number;
  cash_total: number;
  stripe_net: number;
  services_total: number;
  retail_total: number;
  tips: { stylist_name: string; stylist_color: string; tip_amount: number }[];
}

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
];

const STYLIST_COLORS = ["#C9A84C", "#60A5FA", "#34D399", "#F87171", "#FB923C"];

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function formatDateLabel(iso: string) {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function computeShiftHours(logs: ShiftLog[]): Record<string, number> {
  const byStaff: Record<string, ShiftLog[]> = {};
  for (const log of logs) {
    if (!byStaff[log.staff_id]) byStaff[log.staff_id] = [];
    byStaff[log.staff_id].push(log);
  }
  const result: Record<string, number> = {};
  for (const [staffId, entries] of Object.entries(byStaff)) {
    let total = 0;
    let lastIn: Date | null = null;
    for (const e of entries) {
      if (e.event === "clock_in") {
        lastIn = new Date(e.logged_at);
      } else if (e.event === "clock_out" && lastIn) {
        total += (new Date(e.logged_at).getTime() - lastIn.getTime()) / 3_600_000;
        lastIn = null;
      }
    }
    if (lastIn) total += (Date.now() - lastIn.getTime()) / 3_600_000;
    result[staffId] = total;
  }
  return result;
}

function generateMockRows(startIso: string, days: number): DayRow[] {
  const NAMES = ["Kelly Stanton", "Abbey Krutzer", "Nina Torres", "Marcus Bell"];
  const seed = (iso: string, offset: number) => {
    let h = 0;
    for (const c of iso + offset) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return Math.abs(h) / 0xffffffff;
  };
  const rows: DayRow[] = [];
  for (let i = 0; i < days; i++) {
    const [y, m, d] = startIso.split("-").map(Number);
    const date = toISO(addDays(new Date(y, m - 1, d), i));
    if (new Date(date).getDay() === 0) continue;
    const base = 400 + seed(date, 0) * 600;
    const card = base * (0.6 + seed(date, 1) * 0.3);
    const cash = base * (0.05 + seed(date, 2) * 0.15);
    const retail = base * (0.08 + seed(date, 3) * 0.12);
    rows.push({
      date, card_total: card, cash_total: cash,
      stripe_net: card - (card * 0.029 + 0.30),
      services_total: base - retail, retail_total: retail,
      tips: NAMES.map((name, si) => ({
        stylist_name: name, stylist_color: STYLIST_COLORS[si % STYLIST_COLORS.length],
        tip_amount: 15 + seed(date, 10 + si) * 85,
      })),
    });
  }
  return rows;
}

function MetricCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent: string; trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon style={{ width: 18, height: 18 }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            <ArrowUpRight className="w-3 h-3" style={{ transform: trend < 0 ? "rotate(90deg)" : undefined }} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-stone-800 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

export default function BookkeepingTab({ restaurantId }: { restaurantId: string }) {
  const { data: settings } = useRestaurantSettings(restaurantId);
  const update = useUpdateSettings(restaurantId);
  const { data: staffList = [] } = useStaff(restaurantId);

  const today = new Date();
  const [preset, setPreset] = useState(1);
  const [showPresets, setShowPresets] = useState(false);
  const [autoEmail, setAutoEmail] = useState<boolean>(
    (settings as (typeof settings & { auto_email_daily_report?: boolean }) | undefined)?.auto_email_daily_report ?? false,
  );
  const [savingEmail, setSavingEmail] = useState(false);

  const startDate = addDays(today, -(PRESETS[preset].days - 1));
  const startIso = toISO(startDate);
  const endIso = toISO(today);

  const { data: shiftLogs = [], isLoading: logsLoading } = useShiftLogs(restaurantId, startIso, endIso);
  const shiftHours = useMemo(() => computeShiftHours(shiftLogs), [shiftLogs]);
  const totalShiftHours = Object.values(shiftHours).reduce((s, h) => s + h, 0);

  const rows = useMemo(() => generateMockRows(startIso, PRESETS[preset].days), [startIso, preset]);

  const totals = useMemo(() => {
    const cardTotal = rows.reduce((s, r) => s + r.card_total, 0);
    const cashTotal = rows.reduce((s, r) => s + r.cash_total, 0);
    const stripeNet = rows.reduce((s, r) => s + r.stripe_net, 0);
    const services = rows.reduce((s, r) => s + r.services_total, 0);
    const retail = rows.reduce((s, r) => s + r.retail_total, 0);
    const tipMap: Record<string, { color: string; amount: number }> = {};
    for (const row of rows) {
      for (const t of row.tips) {
        if (!tipMap[t.stylist_name]) tipMap[t.stylist_name] = { color: t.stylist_color, amount: 0 };
        tipMap[t.stylist_name].amount += t.tip_amount;
      }
    }
    const tipRows = Object.entries(tipMap).map(([name, v]) => ({ name, color: v.color, amount: v.amount }));
    return { cardTotal, cashTotal, stripeNet, services, retail, totalRevenue: cardTotal + cashTotal, tipRows, totalTips: tipRows.reduce((s, t) => s + t.amount, 0) };
  }, [rows]);

  const handleAutoEmailToggle = async (val: boolean) => {
    setAutoEmail(val); setSavingEmail(true);
    try {
      await update.mutateAsync({ auto_email_daily_report: val } as never);
      toast.success(val ? "Daily CSV reports enabled" : "Disabled");
    } catch { setAutoEmail(!val); toast.error("Failed to save"); }
    finally { setSavingEmail(false); }
  };

  const handleExportCSV = () => {
    const headers = ["Date","Card","Cash","Stripe Net","Services","Retail"];
    const lines = [headers.join(","), ...rows.map((r) => [r.date, r.card_total.toFixed(2), r.cash_total.toFixed(2), r.stripe_net.toFixed(2), r.services_total.toFixed(2), r.retail_total.toFixed(2)].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `loomis-${startIso}-${endIso}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("CSV exported");
  };

  const servicesPercent = totals.services + totals.retail > 0 ? (totals.services / (totals.services + totals.retail)) * 100 : 0;
  const PALETTE = ["#C9A84C","#7EB8B0","#E07B7B","#A07BD4","#60A5FA","#34D399","#FB923C"];

  return (
    <div className="space-y-8">

      {/* Date range toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative">
          <button
            onClick={() => setShowPresets((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            {PRESETS[preset].label}
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${showPresets ? "rotate-180" : ""}`} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-stone-100 rounded-xl shadow-xl overflow-hidden w-40">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => { setPreset(i); setShowPresets(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === preset ? "bg-[hsl(38,65%,55%)]/10 text-[hsl(38,65%,55%)] font-semibold" : "text-stone-700 hover:bg-stone-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-stone-400 hidden sm:block">{formatDateLabel(startIso)} — {formatDateLabel(endIso)}</p>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-gold text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Revenue" value={fmt(totals.totalRevenue)} sub="Card + cash combined" icon={TrendingUp} accent="bg-emerald-500/10 text-emerald-500" />
        <MetricCard label="Stripe Direct Deposit" value={fmt(totals.stripeNet)} sub={`After fees · ${fmt(totals.cardTotal - totals.stripeNet)} in fees`} icon={CreditCard} accent="bg-sky-500/10 text-sky-500" />
        <MetricCard label="Cash Drawer" value={fmt(totals.cashTotal)} sub="Physical cash collected" icon={Banknote} accent="bg-[hsl(38,65%,55%)]/15 text-[hsl(38,65%,55%)]" />
      </div>

      {/* Revenue breakdown + tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-800">Revenue Breakdown</p>
          {[
            { label: "Services Volume", icon: Scissors, value: totals.services, pct: servicesPercent, color: "hsl(38,65%,55%)" },
            { label: "Product / Retail", icon: ShoppingBag, value: totals.retail, pct: 100 - servicesPercent, color: "hsl(199,95%,60%)" },
          ].map(({ label, icon: Icon, value, pct, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p className="text-xs font-medium text-stone-700">{label}</p>
                </div>
                <p className="text-sm font-bold text-stone-800">{fmt(value)}</p>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
              <p className="text-[10px] text-stone-400 mt-1">{pct.toFixed(0)}% of total</p>
            </div>
          ))}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
            <p className="text-xs text-stone-400">Total billable</p>
            <p className="text-sm font-bold text-stone-800">{fmt(totals.services + totals.retail)}</p>
          </div>
        </div>

        {/* Tip distribution */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Stylist Tip Distribution</p>
            <span className="text-xs font-semibold text-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/10 border border-[hsl(38,65%,55%)]/20 px-2 py-0.5 rounded-full">{fmt(totals.totalTips)} total</span>
          </div>
          <div className="space-y-2.5">
            {totals.tipRows.map((row) => {
              const pct = totals.totalTips > 0 ? (row.amount / totals.totalTips) * 100 : 0;
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: row.color }}>
                    {initials(row.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-stone-700 truncate">{row.name}</p>
                      <p className="text-xs font-bold text-stone-800 ml-2 flex-shrink-0">{fmt(row.amount)}</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400 w-8 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payroll & Hours */}
      <div className="space-y-4">
        <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Payroll & Hours</h3>
          {totalShiftHours > 0 && (
            <span className="text-xs font-semibold text-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/10 border border-[hsl(38,65%,55%)]/20 px-2.5 py-0.5 rounded-full">
              {fmtHours(totalShiftHours)} total
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5">
          {logsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
          ) : staffList.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-4">No staff profiles found. Add team members from the Calendar page.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                <div className="w-7 flex-shrink-0" />
                <div className="flex-1">Stylist</div>
                <div className="w-24 text-right flex-shrink-0">Active Hours</div>
                <div className="w-16 text-right flex-shrink-0">Status</div>
              </div>
              {staffList.map((s, i) => {
                const color = s.color ?? PALETTE[i % PALETTE.length];
                const hours = shiftHours[s.id] ?? 0;
                const maxH = Math.max(...staffList.map((st) => shiftHours[st.id] ?? 0), 1);
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: color }}>
                      {s.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-700 truncate mb-1">{s.name}</p>
                      <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(hours / maxH) * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <p className={`text-xs font-bold w-24 text-right flex-shrink-0 ${hours > 0 ? "text-stone-800" : "text-stone-300"}`}>
                      {hours > 0 ? fmtHours(hours) : "—"}
                    </p>
                    <div className="w-16 flex justify-end flex-shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.is_clocked_in ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700" : "bg-stone-50 border-stone-200 text-stone-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_clocked_in ? "bg-emerald-500" : "bg-stone-300"}`} />
                        {s.is_clocked_in ? "In" : "Out"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {totalShiftHours === 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-400">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[hsl(38,65%,55%)]" />
                  <p>Hours log automatically when a stylist is toggled <span className="text-stone-600 font-medium">On Floor</span>. No shifts recorded for this date range yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <div className="border-b border-stone-100 pb-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Data & Reporting</h3>
        </div>
        <div className="rounded-xl border border-stone-100 bg-stone-50/40 px-4 py-3.5 flex items-start gap-3">
          <Info className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-stone-500 leading-relaxed">
            Data older than 30 days is accessible via your{" "}
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(38,65%,55%)] hover:underline inline-flex items-center gap-0.5">
              Stripe Dashboard <ExternalLink className="w-2.5 h-2.5" />
            </a>.
          </p>
        </div>
        <div className="rounded-xl border border-stone-100 bg-white p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[hsl(38,65%,55%)]/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-[hsl(38,65%,55%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800">Auto-Email Daily CSV</p>
            <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">Receive a full financial summary every night at closing.</p>
          </div>
          {savingEmail ? <Loader2 className="w-4 h-4 animate-spin text-stone-400 flex-shrink-0" /> : (
            <Switch checked={autoEmail} onCheckedChange={handleAutoEmailToggle} className="flex-shrink-0" />
          )}
        </div>
      </div>

    </div>
  );
}
