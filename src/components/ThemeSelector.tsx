import { THEMES, type ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

type Props = {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
};

export default function ThemeSelector({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Visual Style
      </h3>
      <div className="grid grid-cols-5 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.name}
            className={cn(
              "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all",
              value === t.id
                ? "bg-secondary ring-2 ring-primary"
                : "hover:bg-secondary/60"
            )}
          >
            <div
              className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
              style={{ backgroundColor: t.swatch }}
            />
            <span className="text-[10px] text-muted-foreground leading-tight text-center">
              {t.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
