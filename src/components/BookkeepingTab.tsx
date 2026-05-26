import { useState, useMemo } from "react";
import { useShiftLogs, useStaff, type ShiftLog } from "@/hooks/useStaff";
import { useUpdateSettings } from "@/hooks/useRestaurantSettings";
import {
  TrendingUp, CreditCard, Banknote, Download, Mail, ChevronDown,
  ArrowUpRight, Scissors, ShoppingBag, Clock, Info, ExternalLink,
  Loader as Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SectionHead } from "@/pages/Dashboard";
import { SEED_STYLISTS } from "@/lib/stylists";
import { toast } from "sonner";

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function toISO(d: Date) { return d.toISOString().split("T")[0]; }
function fmtDate(iso: string) { const [y,m,d] = iso.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function fmtHours(h: number) { const hrs=Math.floor(h),mins=Math.round((h-hrs)*60); if(hrs===0)return `${mins}m`; return mins>0?`${hrs}h ${mins}m`:`${hrs}h`; }

function computeShiftHours(logs: ShiftLog[]) {
  const byStaff: Record<string, ShiftLog[]> = {};
  for (const l of logs) { (byStaff[l.staff_id] ??= []).push(l); }
  const result: Record<string, number> = {};
  for (const [id, entries] of Object.entries(byStaff)) {
    let total = 0, lastIn: Date | null = null;
    for (const e of entries.sort((a,b) => a.logged_at.localeCompare(b.logged_at))) {
      if (e.event === "clock_in") lastIn = new Date(e.logged_at);
      else if (e.event === "clock_out" && lastIn) { total += (new Date(e.logged_at).getTime() - lastIn.getTime()) / 3600000; lastIn = null; }
    }
    if (lastIn) total += (Date.now() - lastIn.getTime()) / 3600000;
    result[id] = total;
  }
  return result;
}

// Deterministic pseudo-random revenue mock data
function genRows(startIso: string, days: number) {
  function rng(seed: string, offset: number) {
    let h = offset;
    for (const c of seed) h = (h*31 + c.charCodeAt(0)) & 0xffffffff;
    return Math.abs(h) / 0xffffffff;
  }
  const rows = [];
  for (let i = 0; i < days; i++) {
    const [y,m,d] = startIso.split("-").map(Number);
    const date = toISO(addDays(new Date(y,m-1,d), i));
    const dow = new Date(date).getDay();
    if (dow === 0) continue;
    const base = 350 + rng(date,1)*700;
    const card = base * (0.6 + rng(date,2)*0.25);
    const cash = base * (0.05 + rng(date,3)*0.15);
    const retail = base * (0.08 + rng(date,4)*0.1);
    rows.push({ date, card, cash, stripeNet: card - (card*0.029+0.30), services: base-retail, retail,
      tips: SEED_STYLISTS.map((s,si) => ({ name: s.name, color: s.color, amount: 12+rng(date,10+si)*80 })) });
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
          <Icon style={{width:18,height:18}} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend>=0?"text-emerald-500":"text-red-400"}`}>
            <ArrowUpRight className="w-3 h-3" style={{transform:trend<0?"rotate(90deg)":undefined}} />
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
  const update = useUpdateSettings(restaurantId);
  const { data: staffList = [] } = useStaff(restaurantId || null);
  const today = new Date();
  const [preset, setPreset] = useState(1);
  const [showPresets, setShowPresets] = useState(false);
  const [autoEmail, setAutoEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  const startDate = addDays(today, -(PRESETS[preset].days - 1));
  const startIso = toISO(startDate);
  const endIso = toISO(today);

  const { data: shiftLogs = [], isLoading: logsLoading } = useShiftLogs(restaurantId || null, startIso, endIso);
  const shiftHours = useMemo(() => computeShiftHours(shiftLogs), [shiftLogs]);
  const totalShiftHours = Object.values(shiftHours).reduce((s,h) => s+h, 0);

  const rows = useMemo(() => genRows(startIso, PRESETS[preset].days), [startIso, preset]);
  const totals = useMemo(() => {
    const card = rows.reduce((s,r) => s+r.card, 0);
    const cash = rows.reduce((s,r) => s+r.cash, 0);
    const net = rows.reduce((s,r) => s+r.stripeNet, 0);
    const svc = rows.reduce((s,r) => s+r.services, 0);
    const ret = rows.reduce((s,r) => s+r.retail, 0);
    const tipMap: Record<string, { color: string; amount: number }> = {};
    for (const row of rows) for (const t of row.tips) {
      if (!tipMap[t.name]) tipMap[t.name] = { color: t.color, amount: 0 };
      tipMap[t.name].amount += t.amount;
    }
    const tipRows = Object.entries(tipMap).map(([name,v]) => ({ name, color: v.color, amount: v.amount }));
    return { card, cash, net, svc, ret, total: card+cash, tipRows, totalTips: tipRows.reduce((s,t)=>s+t.amount,0) };
  }, [rows]);

  const handleEmailToggle = async (val: boolean) => {
    setAutoEmail(val); setSavingEmail(true);
    try { await update.mutateAsync({ auto_email_daily_report: val } as never); toast.success(val?"Daily reports enabled":"Disabled"); }
    catch { setAutoEmail(!val); toast.error("Failed to save"); }
    finally { setSavingEmail(false); }
  };

  const exportCSV = () => {
    const h = ["Date","Card","Cash","Stripe Net","Services","Retail"];
    const lines = [h.join(","), ...rows.map(r=>[r.date,r.card.toFixed(2),r.cash.toFixed(2),r.stripeNet.toFixed(2),r.services.toFixed(2),r.retail.toFixed(2)].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv"}));
    a.download = `loomis-${startIso}-to-${endIso}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast.success("CSV exported");
  };

  const svcPct = totals.svc+totals.ret > 0 ? (totals.svc/(totals.svc+totals.ret))*100 : 0;

  // Merge DB staff with seed fallback for payroll display
  const displayStaff = staffList.length > 0 ? staffList : SEED_STYLISTS.map((s,i) => ({
    id: s.id, name: s.name, is_clocked_in: false, color: s.color, color_index: i,
    restaurant_id: "", shift_start: null, shift_end: null, break_start: null, break_end: null, weekly_availability: null, created_at: "",
  }));

  return (
    <div className="space-y-8">
      <SectionHead title="Bookkeeping & Payouts" sub="Financial overview, payroll hours, and automated reporting." />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative">
          <button onClick={() => setShowPresets(v=>!v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors">
            {PRESETS[preset].label}
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${showPresets?"rotate-180":""}`} />
          </button>
          {showPresets && (
            <div className="absolute top-full mt-1.5 left-0 z-20 bg-white border border-stone-100 rounded-xl shadow-xl overflow-hidden w-44">
              {PRESETS.map((p,i) => (
                <button key={p.label} onClick={() => { setPreset(i); setShowPresets(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i===preset?"bg-[hsl(38,65%,55%)]/10 text-[hsl(38,65%,55%)] font-semibold":"text-stone-700 hover:bg-stone-50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 hidden sm:block">{fmtDate(startIso)} — {fmtDate(endIso)}</span>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-gold text-white font-semibold text-sm hover:opacity-90 transition-all shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Top 3 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Revenue" value={fmt(totals.total)} sub="Card + cash" icon={TrendingUp} accent="bg-emerald-500/10 text-emerald-500" trend={4.2} />
        <MetricCard label="Stripe Net Deposit" value={fmt(totals.net)} sub={`After fees · ${fmt(totals.card-totals.net)} in fees`} icon={CreditCard} accent="bg-sky-500/10 text-sky-500" />
        <MetricCard label="Cash Drawer" value={fmt(totals.cash)} sub="Physical cash collected" icon={Banknote} accent="bg-[hsl(38,65%,55%)]/15 text-[hsl(38,65%,55%)]" />
      </div>

      {/* Revenue breakdown + Tip distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Service vs Retail */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-800">Revenue Breakdown</p>
          {[
            { label: "Service Volume", icon: Scissors, value: totals.svc, pct: svcPct, color: "hsl(38,65%,55%)" },
            { label: "Retail Products", icon: ShoppingBag, value: totals.ret, pct: 100-svcPct, color: "hsl(199,95%,55%)" },
          ].map(({ label, icon: Icon, value, pct, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color+"20" }}>
                    <Icon style={{width:14,height:14,color}} />
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
          <div className="pt-3 border-t border-stone-100 flex justify-between">
            <p className="text-xs text-stone-400">Total billable</p>
            <p className="text-sm font-bold text-stone-800">{fmt(totals.svc+totals.ret)}</p>
          </div>
        </div>

        {/* Tip distribution */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Stylist Tip Distribution</p>
            <span className="text-xs font-semibold text-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/10 border border-[hsl(38,65%,55%)]/20 px-2 py-0.5 rounded-full">{fmt(totals.totalTips)}</span>
          </div>
          <div className="space-y-3">
            {totals.tipRows.map(row => {
              const pct = totals.totalTips > 0 ? (row.amount/totals.totalTips)*100 : 0;
              const initials = row.name.split(" ").map((w: string)=>w[0]).join("").toUpperCase().slice(0,2);
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: row.color }}>{initials}</div>
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

      {/* Payroll & Hours timecard */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Payroll Timecard</h3>
          {totalShiftHours > 0 && <span className="text-xs font-semibold text-[hsl(38,65%,55%)] bg-[hsl(38,65%,55%)]/10 border border-[hsl(38,65%,55%)]/20 px-2.5 py-0.5 rounded-full">{fmtHours(totalShiftHours)} total</span>}
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5">
          {logsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[28px_1fr_80px_60px] gap-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                <div />
                <div>Stylist</div>
                <div className="text-right">Hours</div>
                <div className="text-right">Status</div>
              </div>
              {displayStaff.map((s) => {
                const hours = shiftHours[s.id] ?? 0;
                const maxH = Math.max(...displayStaff.map(st => shiftHours[st.id] ?? 0), 1);
                const color = s.color ?? "#C9A84C";
                const initials = s.name.split(" ").map((w: string)=>w[0]).join("").toUpperCase().slice(0,2);
                return (
                  <div key={s.id} className="grid grid-cols-[28px_1fr_80px_60px] gap-3 items-center">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{initials}</div>
                    <div>
                      <p className="text-xs font-medium text-stone-700 truncate mb-1">{s.name}</p>
                      <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(hours/maxH)*100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <p className={`text-xs font-bold text-right ${hours>0?"text-stone-800":"text-stone-300"}`}>{hours>0?fmtHours(hours):"—"}</p>
                    <div className="flex justify-end">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.is_clocked_in?"bg-emerald-500/10 border-emerald-500/25 text-emerald-700":"bg-stone-50 border-stone-200 text-stone-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_clocked_in?"bg-emerald-500":"bg-stone-300"}`} />
                        {s.is_clocked_in?"In":"Out"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {totalShiftHours === 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-400">
                  <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[hsl(38,65%,55%)]" />
                  <p>Hours are logged automatically when a stylist is toggled <span className="text-stone-600 font-semibold">On Floor</span>. No shift data for this period yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reporting */}
      <div className="space-y-4">
        <div className="border-b border-stone-100 pb-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Reporting</h3>
        </div>
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-stone-100 bg-stone-50/40">
          <Info className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-stone-500 leading-relaxed">
            Data older than 90 days is available in your{" "}
            <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-[hsl(38,65%,55%)] hover:underline inline-flex items-center gap-0.5">
              Stripe Dashboard <ExternalLink className="w-2.5 h-2.5" />
            </a>.
          </p>
        </div>
        <div className="rounded-xl border border-stone-100 bg-white p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[hsl(38,65%,55%)]/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-[hsl(38,65%,55%)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">Auto-Email Daily CSV Report</p>
            <p className="text-xs text-stone-400 mt-0.5">Receive a full financial summary every night at closing.</p>
          </div>
          {savingEmail ? <Loader2 className="w-4 h-4 animate-spin text-stone-400" /> : <Switch checked={autoEmail} onCheckedChange={handleEmailToggle} />}
        </div>
      </div>
    </div>
  );
}
