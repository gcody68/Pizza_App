import { Lock } from "lucide-react";

export default function SubscriptionBanner() {
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
