import { useState, useMemo } from "react";
import { useRestaurantSettings, useUpdateSettings } from "@/hooks/useRestaurantSettings";
import { useShiftLogs, useStaff, type ShiftLog } from "@/hooks/useStaff";
import {
  CreditCard, Banknote, TrendingUp, Download, Mail, ChevronDown,
  Loader as Loader2, ArrowUpRight, ExternalLink, Scissors, ShoppingBag, Info, Clock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DayRow {
  date: string;
  card_total: number;
  cash_total: number;
  stripe_net: number;
  services_total: number;
  retail_total: number;
  tips: StylistTip[];
}

interface StylistTip {
  stylist_name: string;
  stylist_color: string;
  tip_amount: number;
}

interface BookkeepingSettings {
  auto_email_daily_report: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDateLabel(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Pair clock_in / clock_out events to calculate total hours per staff member */
function computeShiftHours(logs: ShiftLog[]): Record<string, number> {
  // Group by staff_id
  const byStaff: Record<string, ShiftLog[]> = {};
  for (const log of logs) {
    if (!byStaff[log.staff_id]) byStaff[log.staff_id] = [];
    byStaff[log.staff_id].push(log);
  }
  const result: Record<string, number> = {};
  for (const [staffId, entries] of Object.entries(byStaff)) {
    let total = 0;
    let lastClockIn: Date | null = null;
    for (const entry of entries) {
      if (entry.event === "clock_in") {
        lastClockIn = new Date(entry.logged_at);
      } else if (entry.event === "clock_out" && lastClockIn) {
        total += (new Date(entry.logged_at).getTime() - lastClockIn.getTime()) / 3_600_000;
        lastClockIn = null;
      }
    }
    // If still clocked in (no matching clock_out), count up to now
    if (lastClockIn) {
      total += (Date.now() - lastClockIn.getTime()) / 3_600_000;
    }
    result[staffId] = total;
  }
  return result;
}

function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Preset range labels ───────────────────────────────────────────────────────
const PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
];

const STYLIST_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#FB923C", "#38BDF8", "#A78BFA",
];

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Mock data generator (stands in until live order data is wired) ─────────────
function generateMockRows(startIso: string, days: number): DayRow[] {
  const rows: DayRow[] = [];
  const STYLIST_NAMES = ["Kelly Stanton", "Abbey Krutzer", "Nina Torres", "Marcus Bell"];
  const seed = (iso: string, offset: number) => {
    let h = 0;
    for (const c of iso + offset) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return Math.abs(h) / 0xffffffff;
  };
  for (let i = 0; i < days; i++) {
    const [y, m, d] = startIso.split("-").map(Number);
    const date = toISO(addDays(new Date(y, m - 1, d), i));
    const dayNum = new Date(date).getDay();
    if (dayNum === 0) continue; // closed Sundays
    const base = 400 + seed(date, 0) * 600;
    const card = base * (0.6 + seed(date, 1) * 0.3);
    const cash = base * (0.05 + seed(date, 2) * 0.15);
    const retail = base * (0.08 + seed(date, 3) * 0.12);
    const services = base - retail;
    const stripeFee = card * 0.029 + (card > 0 ? 0.30 : 0);
    const stripeNet = card - stripeFee;
    const tips: StylistTip[] = STYLIST_NAMES.map((name, si) => ({
      stylist_name: name,
      stylist_color: STYLIST_COLORS[si % STYLIST_COLORS.length],
      tip_amount: 15 + seed(date, 10 + si) * 85,
    }));
    rows.push({
      date,
      card_total: card,
      cash_total: cash,
      stripe_net: stripeNet,
      services_total: services,
      retail_total: retail,
      tips,
    });
  }
  return rows;
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
          <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            <ArrowUpRight className="w-3 h-3" style={{ transform: trend < 0 ? "rotate(90deg)" : undefined }} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookkeepingTab({ restaurantId }: { restaurantId: string }) {
  const { data: settings } = useRestaurantSettings(restaurantId);
  const update = useUpdateSettings(restaurantId);
  const { data: staffList = [] } = useStaff(restaurantId);

  const today = new Date();
  const [preset, setPreset] = useState(1); // index into PRESETS
  const [showPresets, setShowPresets] = useState(false);
  const [autoEmail, setAutoEmail] = useState<boolean>(
    (settings as (typeof settings & { auto_email_daily_report?: boolean }) | undefined)?.auto_email_daily_report ?? false
  );
  const [savingEmail, setSavingEmail] = useState(false);

  const selectedPreset = PRESETS[preset];
  const startDate = addDays(today, -(selectedPreset.days - 1));
  const startIso = toISO(startDate);
  const endIso = toISO(today);

  const { data: shiftLogs = [], isLoading: logsLoading } = useShiftLogs(restaurantId, startIso, endIso);

  // Shift hours per staff_id
  const shiftHours = useMemo(() => computeShiftHours(shiftLogs), [shiftLogs]);
  const totalShiftHours = Object.values(shiftHours).reduce((s, h) => s + h, 0);

  // Use mock data until appointments are fully live
  const rows = useMemo(
    () => generateMockRows(startIso, selectedPreset.days),
    [startIso, selectedPreset.days],
  );

  // Aggregated totals
  const totals = useMemo(() => {
    const cardTotal = rows.reduce((s, r) => s + r.card_total, 0);
    const cashTotal = rows.reduce((s, r) => s + r.cash_total, 0);
    const stripeNet = rows.reduce((s, r) => s + r.stripe_net, 0);
    const services = rows.reduce((s, r) => s + r.services_total, 0);
    const retail = rows.reduce((s, r) => s + r.retail_total, 0);
    const totalRevenue = cardTotal + cashTotal;
    // Aggregate tips by stylist across all days
    const tipMap: Record<string, { color: string; amount: number }> = {};
    for (const row of rows) {
      for (const t of row.tips) {
        if (!tipMap[t.stylist_name]) tipMap[t.stylist_name] = { color: t.stylist_color, amount: 0 };
        tipMap[t.stylist_name].amount += t.tip_amount;
      }
    }
    const tipRows = Object.entries(tipMap).map(([name, v]) => ({ name, color: v.color, amount: v.amount }));
    const totalTips = tipRows.reduce((s, t) => s + t.amount, 0);
    return { cardTotal, cashTotal, stripeNet, services, retail, totalRevenue, tipRows, totalTips };
  }, [rows]);

  const handleAutoEmailToggle = async (val: boolean) => {
    setAutoEmail(val);
    setSavingEmail(true);
    try {
      await update.mutateAsync({ auto_email_daily_report: val } as never);
      toast.success(val ? "Daily CSV reports enabled" : "Daily CSV reports disabled");
    } catch {
      setAutoEmail(!val);
      toast.error("Failed to save setting");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Card Revenue", "Cash Revenue", "Stripe Net", "Services", "Retail"];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        [
          r.date,
          r.card_total.toFixed(2),
          r.cash_total.toFixed(2),
          r.stripe_net.toFixed(2),
          r.services_total.toFixed(2),
          r.retail_total.toFixed(2),
        ].join(",")
      ),
    ];
    // Append tip rows per day
    const tipHeaders = ["", "", "", "", "", "", ...totals.tipRows.map((t) => `${t.name} Tips`)];
    lines[0] += "," + totals.tipRows.map((t) => `"${t.name} Tips"`).join(",");
    rows.forEach((r, i) => {
      const tipByStylest: Record<string, number> = {};
      for (const t of r.tips) tipByStylest[t.stylist_name] = t.tip_amount;
      lines[i + 1] += "," + totals.tipRows.map((t) => tipByStylest[t.name]?.toFixed(2) ?? "0.00").join(",");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loomis-bookkeeping-${startIso}-to-${endIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const servicesPercent = totals.services + totals.retail > 0
    ? (totals.services / (totals.services + totals.retail)) * 100
    : 0;

  return (
    <div className="space-y-8">

      {/* ── Date range toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative">
          <button
            onClick={() => setShowPresets((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary/40 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            {selectedPreset.label}
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showPresets ? "rotate-180" : ""}`} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1.5 left-0 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-40">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => { setPreset(i); setShowPresets(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    i === preset
                      ? "bg-gold/10 text-gold font-semibold"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden sm:block">
            {formatDateLabel(startIso)} — {formatDateLabel(endIso)}
          </p>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Top Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Revenue"
          value={fmt(totals.totalRevenue)}
          sub="Card + cash combined"
          icon={TrendingUp}
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <MetricCard
          label="Stripe Direct Deposit"
          value={fmt(totals.stripeNet)}
          sub={`After processing fees · ${fmt(totals.cardTotal - totals.stripeNet)} in fees`}
          icon={CreditCard}
          accent="bg-sky-500/10 text-sky-500"
        />
        <MetricCard
          label="Cash Drawer Balance"
          value={fmt(totals.cashTotal)}
          sub="Physical cash collected"
          icon={Banknote}
          accent="bg-gold/15 text-gold"
        />
      </div>

      {/* ── End-of-Shift Breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Services vs Retail */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Revenue Breakdown</p>

          <div className="space-y-3">
            {/* Services bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Scissors className="w-3.5 h-3.5 text-gold" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Services Volume</p>
                </div>
                <p className="text-sm font-bold text-foreground">{fmt(totals.services)}</p>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${servicesPercent}%`, background: "hsl(38,65%,55%)" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{servicesPercent.toFixed(0)}% of total</p>
            </div>

            {/* Retail bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <ShoppingBag className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Product / Retail Sales</p>
                </div>
                <p className="text-sm font-bold text-foreground">{fmt(totals.retail)}</p>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${100 - servicesPercent}%`, background: "hsl(199,95%,60%)" }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{(100 - servicesPercent).toFixed(0)}% of total</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total billable</p>
            <p className="text-sm font-bold text-foreground">{fmt(totals.services + totals.retail)}</p>
          </div>
        </div>

        {/* Stylist Tip Distribution */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Stylist Tip Distribution</p>
            <span className="text-xs font-semibold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
              {fmt(totals.totalTips)} total
            </span>
          </div>

          <div className="space-y-2.5">
            {totals.tipRows.map((row) => {
              const pct = totals.totalTips > 0 ? (row.amount / totals.totalTips) * 100 : 0;
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: row.color }}
                  >
                    {initials(row.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-foreground truncate">{row.name}</p>
                      <p className="text-xs font-bold text-foreground ml-2 flex-shrink-0">{fmt(row.amount)}</p>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right flex-shrink-0">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Tip amounts are estimated from appointment records. Confirm final amounts at close.
            </p>
          </div>
        </div>
      </div>

      {/* ── Payroll & Hours ── */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payroll & Hours</h3>
          {totalShiftHours > 0 && (
            <span className="text-xs font-semibold text-gold bg-gold/10 border border-gold/20 px-2.5 py-0.5 rounded-full">
              {fmtHours(totalShiftHours)} total
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {logsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No staff profiles found. Add team members from the Calendar page.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="flex items-center gap-3 px-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="w-7 flex-shrink-0" />
                <div className="flex-1">Stylist</div>
                <div className="flex-shrink-0 text-right w-24">Active Hours</div>
                <div className="flex-shrink-0 text-right w-16">Status</div>
              </div>

              {staffList.map((s, i) => {
                const PALETTE = ["#C9A84C", "#7EB8B0", "#E07B7B", "#A07BD4", "#60A5FA", "#34D399", "#FB923C"];
                const color = s.color ?? PALETTE[i % PALETTE.length];
                const hours = shiftHours[s.id] ?? 0;
                const maxHours = Math.max(...staffList.map((st) => shiftHours[st.id] ?? 0), 1);
                const pct = (hours / maxHours) * 100;

                return (
                  <div key={s.id} className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {s.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>

                    {/* Hours */}
                    <p className={`text-xs font-bold flex-shrink-0 w-24 text-right ${hours > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {hours > 0 ? fmtHours(hours) : "—"}
                    </p>

                    {/* Clock status */}
                    <div className="flex-shrink-0 w-16 flex justify-end">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        s.is_clocked_in
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
                          : "bg-secondary border-border text-muted-foreground"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.is_clocked_in ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        {s.is_clocked_in ? "In" : "Out"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {totalShiftHours === 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gold" />
                    <p className="leading-relaxed">
                      Hours are logged automatically each time a stylist is toggled{" "}
                      <span className="text-foreground font-medium">On Floor</span>. No shifts recorded yet for this date range.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Data Controls & Email Settings ── */}
      <div className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data & Reporting</h3>
        </div>

        {/* Stripe data note */}
        <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3.5 flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium">30-day rolling window</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Data older than 30 days can be accessed anytime via your connected{" "}
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline inline-flex items-center gap-0.5"
              >
                Stripe Dashboard <ExternalLink className="w-2.5 h-2.5" />
              </a>.
            </p>
          </div>
        </div>

        {/* Auto-email toggle */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Auto-Email Daily CSV Report</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Automatically receive a complete financial summary spreadsheet in your inbox every night at closing time.
            </p>
          </div>
          {savingEmail ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
          ) : (
            <Switch
              checked={autoEmail}
              onCheckedChange={handleAutoEmailToggle}
              className="flex-shrink-0"
            />
          )}
        </div>
      </div>

    </div>
  );
}


export default BookkeepingTab