import { cn } from "@/lib/utils";

export type BgStyleId =
  | "true-black"
  | "deep-charcoal"
  | "midnight-navy"
  | "warm-slate"
  | "espresso"
  | "forest-dark"
  | "medium-steel"
  | "medium-dusk"
  | "medium-mocha"
  | "medium-sage"
  | "medium-rosewood"
  | "medium-slate-blue"
  | "paper-white"
  | "soft-cream"
  | "cool-gray"
  | "warm-stone"
  | "sky-light"
  | "mint-light";

type BgStyle = {
  id: BgStyleId;
  name: string;
  swatch: string;
  vars: Record<string, string>;
};

export const BG_STYLES: BgStyle[] = [
  {
    id: "true-black",
    name: "True Black",
    swatch: "#000000",
    vars: {
      "--background": "0 0% 0%",
      "--foreground": "0 0% 96%",
      "--card": "0 0% 5%",
      "--card-foreground": "0 0% 96%",
      "--popover": "0 0% 5%",
      "--popover-foreground": "0 0% 96%",
      "--secondary": "0 0% 8%",
      "--secondary-foreground": "0 0% 85%",
      "--muted": "0 0% 8%",
      "--muted-foreground": "0 0% 55%",
      "--border": "0 0% 14%",
      "--input": "0 0% 14%",
    },
  },
  {
    id: "deep-charcoal",
    name: "Charcoal",
    swatch: "#1A1A1A",
    vars: {
      "--background": "0 0% 7%",
      "--foreground": "0 0% 95%",
      "--card": "0 0% 10%",
      "--card-foreground": "0 0% 95%",
      "--popover": "0 0% 10%",
      "--popover-foreground": "0 0% 95%",
      "--secondary": "0 0% 14%",
      "--secondary-foreground": "0 0% 85%",
      "--muted": "0 0% 14%",
      "--muted-foreground": "0 0% 55%",
      "--border": "0 0% 18%",
      "--input": "0 0% 18%",
    },
  },
  {
    id: "midnight-navy",
    name: "Navy",
    swatch: "#0D1B2A",
    vars: {
      "--background": "215 45% 8%",
      "--foreground": "210 20% 95%",
      "--card": "215 40% 12%",
      "--card-foreground": "210 20% 95%",
      "--popover": "215 40% 12%",
      "--popover-foreground": "210 20% 95%",
      "--secondary": "215 30% 16%",
      "--secondary-foreground": "210 15% 82%",
      "--muted": "215 30% 16%",
      "--muted-foreground": "215 15% 50%",
      "--border": "215 25% 22%",
      "--input": "215 25% 22%",
    },
  },
  {
    id: "warm-slate",
    name: "Warm Slate",
    swatch: "#2C2A28",
    vars: {
      "--background": "30 5% 10%",
      "--foreground": "30 10% 94%",
      "--card": "30 5% 14%",
      "--card-foreground": "30 10% 94%",
      "--popover": "30 5% 14%",
      "--popover-foreground": "30 10% 94%",
      "--secondary": "30 5% 18%",
      "--secondary-foreground": "30 8% 82%",
      "--muted": "30 5% 18%",
      "--muted-foreground": "30 5% 52%",
      "--border": "30 5% 24%",
      "--input": "30 5% 24%",
    },
  },
  {
    id: "espresso",
    name: "Espresso",
    swatch: "#1E1410",
    vars: {
      "--background": "20 25% 8%",
      "--foreground": "30 15% 93%",
      "--card": "20 20% 12%",
      "--card-foreground": "30 15% 93%",
      "--popover": "20 20% 12%",
      "--popover-foreground": "30 15% 93%",
      "--secondary": "20 18% 16%",
      "--secondary-foreground": "30 12% 80%",
      "--muted": "20 18% 16%",
      "--muted-foreground": "20 10% 48%",
      "--border": "20 15% 22%",
      "--input": "20 15% 22%",
    },
  },
  {
    id: "forest-dark",
    name: "Forest",
    swatch: "#0F1A14",
    vars: {
      "--background": "150 25% 7%",
      "--foreground": "120 10% 94%",
      "--card": "150 20% 11%",
      "--card-foreground": "120 10% 94%",
      "--popover": "150 20% 11%",
      "--popover-foreground": "120 10% 94%",
      "--secondary": "150 15% 15%",
      "--secondary-foreground": "120 8% 82%",
      "--muted": "150 15% 15%",
      "--muted-foreground": "150 8% 48%",
      "--border": "150 12% 20%",
      "--input": "150 12% 20%",
    },
  },
  // ── Medium tones ──────────────────────────────────────────────────────────
  {
    id: "medium-steel",
    name: "Steel",
    swatch: "#71717a",
    vars: {
      "--background": "240 4% 44%",
      "--foreground": "0 0% 97%",
      "--card": "240 4% 50%",
      "--card-foreground": "0 0% 97%",
      "--popover": "240 4% 50%",
      "--popover-foreground": "0 0% 97%",
      "--secondary": "240 4% 55%",
      "--secondary-foreground": "0 0% 92%",
      "--muted": "240 4% 55%",
      "--muted-foreground": "240 3% 82%",
      "--border": "240 4% 60%",
      "--input": "240 4% 60%",
    },
  },
  {
    id: "medium-dusk",
    name: "Dusk",
    swatch: "#334155",
    vars: {
      "--background": "215 25% 27%",
      "--foreground": "210 20% 96%",
      "--card": "215 25% 32%",
      "--card-foreground": "210 20% 96%",
      "--popover": "215 25% 32%",
      "--popover-foreground": "210 20% 96%",
      "--secondary": "215 22% 37%",
      "--secondary-foreground": "210 15% 88%",
      "--muted": "215 22% 37%",
      "--muted-foreground": "215 15% 70%",
      "--border": "215 20% 42%",
      "--input": "215 20% 42%",
    },
  },
  {
    id: "medium-mocha",
    name: "Mocha",
    swatch: "#78350f",
    vars: {
      "--background": "24 74% 26%",
      "--foreground": "35 30% 96%",
      "--card": "24 70% 31%",
      "--card-foreground": "35 30% 96%",
      "--popover": "24 70% 31%",
      "--popover-foreground": "35 30% 96%",
      "--secondary": "24 60% 36%",
      "--secondary-foreground": "35 25% 88%",
      "--muted": "24 60% 36%",
      "--muted-foreground": "24 30% 72%",
      "--border": "24 55% 42%",
      "--input": "24 55% 42%",
    },
  },
  {
    id: "medium-sage",
    name: "Sage",
    swatch: "#525e54",
    vars: {
      "--background": "128 7% 34%",
      "--foreground": "120 10% 96%",
      "--card": "128 7% 39%",
      "--card-foreground": "120 10% 96%",
      "--popover": "128 7% 39%",
      "--popover-foreground": "120 10% 96%",
      "--secondary": "128 6% 44%",
      "--secondary-foreground": "120 8% 88%",
      "--muted": "128 6% 44%",
      "--muted-foreground": "128 5% 72%",
      "--border": "128 6% 50%",
      "--input": "128 6% 50%",
    },
  },
  {
    id: "medium-rosewood",
    name: "Rosewood",
    swatch: "#881337",
    vars: {
      "--background": "346 74% 30%",
      "--foreground": "0 0% 97%",
      "--card": "346 70% 35%",
      "--card-foreground": "0 0% 97%",
      "--popover": "346 70% 35%",
      "--popover-foreground": "0 0% 97%",
      "--secondary": "346 60% 40%",
      "--secondary-foreground": "0 0% 92%",
      "--muted": "346 60% 40%",
      "--muted-foreground": "346 25% 76%",
      "--border": "346 55% 46%",
      "--input": "346 55% 46%",
    },
  },
  {
    id: "medium-slate-blue",
    name: "Slate Blue",
    swatch: "#475569",
    vars: {
      "--background": "215 20% 35%",
      "--foreground": "210 20% 97%",
      "--card": "215 20% 40%",
      "--card-foreground": "210 20% 97%",
      "--popover": "215 20% 40%",
      "--popover-foreground": "210 20% 97%",
      "--secondary": "215 18% 45%",
      "--secondary-foreground": "210 15% 90%",
      "--muted": "215 18% 45%",
      "--muted-foreground": "215 12% 74%",
      "--border": "215 16% 52%",
      "--input": "215 16% 52%",
    },
  },
  {
    id: "paper-white",
    name: "Paper",
    swatch: "#F7F5F0",
    vars: {
      "--background": "40 20% 96%",
      "--foreground": "0 0% 10%",
      "--card": "40 15% 100%",
      "--card-foreground": "0 0% 10%",
      "--popover": "40 15% 100%",
      "--popover-foreground": "0 0% 10%",
      "--secondary": "40 10% 92%",
      "--secondary-foreground": "0 0% 22%",
      "--muted": "40 10% 92%",
      "--muted-foreground": "0 0% 42%",
      "--border": "40 10% 82%",
      "--input": "40 10% 82%",
    },
  },
  {
    id: "soft-cream",
    name: "Soft Cream",
    swatch: "#FDF6EC",
    vars: {
      "--background": "38 80% 97%",
      "--foreground": "25 30% 12%",
      "--card": "38 60% 100%",
      "--card-foreground": "25 30% 12%",
      "--popover": "38 60% 100%",
      "--popover-foreground": "25 30% 12%",
      "--secondary": "38 40% 93%",
      "--secondary-foreground": "25 20% 25%",
      "--muted": "38 40% 93%",
      "--muted-foreground": "25 15% 45%",
      "--border": "38 30% 85%",
      "--input": "38 30% 85%",
    },
  },
  {
    id: "cool-gray",
    name: "Cool Gray",
    swatch: "#F0F2F5",
    vars: {
      "--background": "216 20% 96%",
      "--foreground": "216 15% 12%",
      "--card": "216 15% 100%",
      "--card-foreground": "216 15% 12%",
      "--popover": "216 15% 100%",
      "--popover-foreground": "216 15% 12%",
      "--secondary": "216 12% 91%",
      "--secondary-foreground": "216 10% 25%",
      "--muted": "216 12% 91%",
      "--muted-foreground": "216 8% 45%",
      "--border": "216 12% 82%",
      "--input": "216 12% 82%",
    },
  },
  {
    id: "warm-stone",
    name: "Warm Stone",
    swatch: "#F5F0EB",
    vars: {
      "--background": "30 25% 95%",
      "--foreground": "20 20% 12%",
      "--card": "30 20% 100%",
      "--card-foreground": "20 20% 12%",
      "--popover": "30 20% 100%",
      "--popover-foreground": "20 20% 12%",
      "--secondary": "30 15% 90%",
      "--secondary-foreground": "20 15% 25%",
      "--muted": "30 15% 90%",
      "--muted-foreground": "20 10% 45%",
      "--border": "30 15% 82%",
      "--input": "30 15% 82%",
    },
  },
  {
    id: "sky-light",
    name: "Sky Light",
    swatch: "#EBF5FB",
    vars: {
      "--background": "205 60% 96%",
      "--foreground": "210 30% 12%",
      "--card": "205 50% 100%",
      "--card-foreground": "210 30% 12%",
      "--popover": "205 50% 100%",
      "--popover-foreground": "210 30% 12%",
      "--secondary": "205 35% 91%",
      "--secondary-foreground": "210 20% 25%",
      "--muted": "205 35% 91%",
      "--muted-foreground": "210 15% 45%",
      "--border": "205 30% 82%",
      "--input": "205 30% 82%",
    },
  },
  {
    id: "mint-light",
    name: "Mint",
    swatch: "#EDFAF4",
    vars: {
      "--background": "150 50% 96%",
      "--foreground": "155 25% 12%",
      "--card": "150 40% 100%",
      "--card-foreground": "155 25% 12%",
      "--popover": "150 40% 100%",
      "--popover-foreground": "155 25% 12%",
      "--secondary": "150 30% 91%",
      "--secondary-foreground": "155 18% 25%",
      "--muted": "150 30% 91%",
      "--muted-foreground": "155 12% 45%",
      "--border": "150 25% 82%",
      "--input": "150 25% 82%",
    },
  },
];

export function applyBgStyle(style: BgStyle) {
  const root = document.documentElement;
  Object.entries(style.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function getBgStyleById(id: string): BgStyle {
  return BG_STYLES.find((s) => s.id === id) || BG_STYLES[1];
}

type Props = {
  value: BgStyleId;
  onChange: (id: BgStyleId) => void;
};

export default function BackgroundStyleSelector({ value, onChange }: Props) {
  const darkStyles = BG_STYLES.filter((s) =>
    ["true-black", "deep-charcoal", "midnight-navy", "warm-slate", "espresso", "forest-dark"].includes(s.id)
  );
  const mediumStyles = BG_STYLES.filter((s) =>
    ["medium-steel", "medium-dusk", "medium-mocha", "medium-sage", "medium-rosewood", "medium-slate-blue"].includes(s.id)
  );
  const lightStyles = BG_STYLES.filter((s) =>
    ["paper-white", "soft-cream", "cool-gray", "warm-stone", "sky-light", "mint-light"].includes(s.id)
  );

  const SwatchRow = ({ styles }: { styles: BgStyle[] }) => (
    <div className="grid grid-cols-6 gap-2">
      {styles.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id as BgStyleId)}
          title={s.name}
          className={cn(
            "flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all",
            value === s.id
              ? "bg-secondary ring-2 ring-primary"
              : "hover:bg-secondary/60"
          )}
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-border shadow-sm"
            style={{ backgroundColor: s.swatch }}
          />
          <span className="text-[9px] text-muted-foreground leading-tight text-center">
            {s.name}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Background Style
      </h3>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Dark</p>
        <SwatchRow styles={darkStyles} />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Medium</p>
        <SwatchRow styles={mediumStyles} />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Light</p>
        <div className="grid grid-cols-6 gap-2">
          {lightStyles.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange(s.id as BgStyleId)}
              title={s.name}
              className={cn(
                "flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all",
                value === s.id
                  ? "bg-secondary ring-2 ring-primary"
                  : "hover:bg-secondary/60"
              )}
            >
              <div
                className="w-7 h-7 rounded-full border-2 border-border shadow-sm"
                style={{ backgroundColor: s.swatch }}
              />
              <span className="text-[9px] text-muted-foreground leading-tight text-center">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
