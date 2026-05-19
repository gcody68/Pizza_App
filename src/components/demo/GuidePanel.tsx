import { useDemo, type DemoStep } from "@/contexts/DemoContext";
import { CircleCheck as CheckCircle2, Circle, Paintbrush, UtensilsCrossed, ShoppingBag, ChevronRight } from "lucide-react";

type Step = {
  id: DemoStep;
  number: number;
  title: string;
  description: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    id: "branding",
    number: 1,
    title: "Branding",
    description: "Set your restaurant name, colors, and theme.",
    hint: "Try changing the theme in the Admin panel.",
    icon: Paintbrush,
  },
  {
    id: "menu",
    number: 2,
    title: "Menu Import",
    description: "Load your menu items or import from a spreadsheet.",
    hint: "Click 'Load Sample Menu' in the Import tab.",
    icon: UtensilsCrossed,
  },
  {
    id: "ordering",
    number: 3,
    title: "Live Ordering",
    description: "Switch to Customer view and place a test order.",
    hint: "Use the [Customer] toggle on the phone frame.",
    icon: ShoppingBag,
  },
];

export default function GuidePanel({ onSignUp }: { onSignUp?: () => void }) {
  const { completedSteps } = useDemo();
  const allDone = STEPS.every((s) => completedSteps.has(s.id));

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-base font-serif font-bold text-gold mb-1">Guided Tour</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Complete each step to experience the full power of Loomis.
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {STEPS.map((step) => {
          const done = completedSteps.has(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                done
                  ? "border-gold/40 bg-gold/8"
                  : "border-border bg-card/50 hover:border-border/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done ? "bg-gold text-black" : "bg-secondary text-muted-foreground border border-border"
                }`}>
                  {done ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{step.number}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${done ? "text-gold" : "text-muted-foreground"}`} />
                    <h3 className={`text-sm font-semibold ${done ? "text-gold" : "text-foreground"}`}>
                      {step.title}
                    </h3>
                    {done && (
                      <span className="text-xs text-gold/70 font-medium ml-auto">Done!</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  {!done && (
                    <p className="text-xs text-gold/60 mt-1.5 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                      {step.hint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-center space-y-3 animate-fade-in">
          <div className="text-2xl">🎉</div>
          <p className="text-sm font-semibold text-gold">Tour Complete!</p>
          <p className="text-xs text-muted-foreground">You've seen what Loomis can do. Ready to go live?</p>
          <button
            onClick={onSignUp}
            className="w-full gradient-gold text-primary-foreground text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Free Trial
          </button>
        </div>
      )}

      {!allDone && (
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-semibold text-gold">{completedSteps.size} / {STEPS.length}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full gradient-gold rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.size / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
