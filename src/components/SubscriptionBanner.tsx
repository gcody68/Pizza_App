import { TriangleAlert as AlertTriangle, ArrowUpRight, Lock } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

const PRICING_URL = "https://loomishq.com/#pricing";

export default function SubscriptionBanner() {
  const { tier, isUnpaid, isBoutique, monthlyOrderCount, boutiquOrderCap, isOrderCapReached } = useSubscription();

  if (tier === "loading" || tier === "pro" || tier === "none") return null;

  if (isUnpaid) {
    return (
      <div className="w-full bg-destructive/15 border-b border-destructive/30 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Your subscription is inactive. Your menu is set to <strong>Offline</strong> and customers cannot place orders.
          </p>
        </div>
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-destructive border border-destructive/40 rounded-md px-3 py-1.5 hover:bg-destructive/10 transition-colors flex-shrink-0"
        >
          Upgrade <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  if (isBoutique && isOrderCapReached) {
    return (
      <div className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400 font-medium">
            Monthly order cap reached ({monthlyOrderCount.toLocaleString()} / {boutiquOrderCap.toLocaleString()}). Checkout is disabled until next month or you upgrade to Pro.
          </p>
        </div>
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 border border-amber-500/40 rounded-md px-3 py-1.5 hover:bg-amber-500/10 transition-colors flex-shrink-0"
        >
          Upgrade to Pro <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  if (isBoutique) {
    return (
      <div className="w-full bg-secondary/60 border-b border-border px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gold/15 text-gold border border-gold/25 px-1.5 py-0.5 rounded uppercase tracking-wide">
            Boutique
          </span>
          <p className="text-xs text-muted-foreground">
            {monthlyOrderCount.toLocaleString()} / {boutiquOrderCap.toLocaleString()} orders this month.{" "}
            <span className="text-muted-foreground/60">Some features require Pro.</span>
          </p>
        </div>
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] font-semibold text-gold/80 hover:text-gold transition-colors flex-shrink-0"
        >
          Upgrade <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return null;
}

/** Inline badge shown next to locked feature labels */
export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-gold/15 text-gold border border-gold/25 px-1.5 py-0.5 rounded uppercase tracking-wide ml-1.5 flex-shrink-0">
      <Lock className="w-2.5 h-2.5" /> Pro
    </span>
  );
}
