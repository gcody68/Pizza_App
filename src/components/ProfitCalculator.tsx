import { useState } from "react";
import { DollarSign, TrendingUp } from "lucide-react";

export default function ProfitCalculator() {
  const [revenue, setRevenue] = useState(10000);

  const loss = revenue * 0.3;
  const formatted = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const maxBar = revenue;
  const uberWidth = Math.min((loss / maxBar) * 100, 100);
  const appWidth = 0;

  return (
    <section className="container py-16">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 md:p-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-serif font-bold text-gold">Stop Losing Money</h2>
          <p className="text-muted-foreground text-sm">
            See how much you're giving away to third-party delivery apps every month.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Average Monthly Revenue
          </label>
          <div className="flex items-center gap-4">
            <span className="text-gold font-bold text-lg min-w-[100px]">{formatted(revenue)}</span>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-[hsl(var(--gold))]"
              style={{
                background: `linear-gradient(to right, hsl(var(--gold)) ${((revenue - 1000) / 99000) * 100}%, hsl(var(--border)) ${((revenue - 1000) / 99000) * 100}%)`,
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground font-medium">Uber Eats / DoorDash</span>
              <span className="text-destructive font-bold">−{formatted(loss)}</span>
            </div>
            <div className="w-full h-8 bg-secondary rounded-md overflow-hidden">
              <div
                className="h-full bg-destructive/80 rounded-md flex items-center px-3 transition-all duration-500"
                style={{ width: `${Math.max(uberWidth, 15)}%` }}
              >
                <span className="text-destructive-foreground text-xs font-semibold whitespace-nowrap">
                  30% Commission Loss
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground font-medium">Your Own App</span>
              <span className="font-bold" style={{ color: "hsl(142 71% 45%)" }}>$0</span>
            </div>
            <div className="w-full h-8 bg-secondary rounded-md overflow-hidden">
              <div
                className="h-full rounded-md flex items-center px-3 transition-all duration-500"
                style={{ width: "15%", backgroundColor: "hsla(142, 71%, 45%, 0.8)" }}
              >
                <span className="text-primary-foreground text-xs font-semibold whitespace-nowrap">
                  0% Commission
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4 pt-4 border-t border-border">
          <p className="text-4xl md:text-5xl font-serif font-bold text-gold">
            Keep an extra {formatted(loss)}
          </p>
          <p className="text-muted-foreground text-lg">in your pocket every month!</p>
          <button
            onClick={() => document.getElementById("get-started")?.scrollIntoView({ behavior: "smooth" })}
            className="gradient-gold text-primary-foreground font-semibold px-8 py-3 rounded-lg text-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            <TrendingUp className="w-5 h-5" />
            Start Saving Now
          </button>
        </div>
      </div>
    </section>
  );
}
