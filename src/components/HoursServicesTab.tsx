import { useState, useRef } from "react";
import { Clock, Scissors, ChevronDown, ChevronUp, Plus, Trash2, Image, Check } from "lucide-react";
import { SectionHead } from "@/pages/Dashboard";
import { useServices, CATEGORY_LABELS, type SalonService, type ServiceCategory } from "@/lib/servicesContext";

const CATEGORY_ICONS: Record<ServiceCategory, React.ElementType> = {
  cuts: Scissors,
  color: Clock,
  styling: Clock,
  treatments: Clock,
};

const CATEGORIES: ServiceCategory[] = ["cuts", "color", "styling", "treatments"];

const BUSINESS_HOURS_INIT = [
  { day: "Monday",    open: "09:00", close: "19:00", closed: false },
  { day: "Tuesday",   open: "09:00", close: "19:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "19:00", closed: false },
  { day: "Thursday",  open: "09:00", close: "20:00", closed: false },
  { day: "Friday",    open: "09:00", close: "20:00", closed: false },
  { day: "Saturday",  open: "09:00", close: "18:00", closed: false },
  { day: "Sunday",    open: "10:00", close: "17:00", closed: true  },
];

// ── Service row editor ────────────────────────────────────────────────────────
function ServiceRow({ svc, onDelete }: { svc: SalonService; onDelete: () => void }) {
  const { updateService } = useServices();
  const [expanded, setExpanded] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<SalonService>) => updateService(svc.id, patch);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) set({ image: URL.createObjectURL(file) });
    e.target.value = "";
  };

  return (
    <div className="border-b border-stone-50 last:border-0">
      {/* ── Compact row ── */}
      <div className="grid grid-cols-[1fr_76px_76px_84px_28px_28px] gap-2 items-center py-2.5">
        <input
          value={svc.name}
          onChange={e => set({ name: e.target.value })}
          className="text-sm font-medium text-stone-800 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-[hsl(38,65%,55%)]/60 focus:outline-none py-0.5 px-0 transition-colors min-w-0"
        />
        <div className="relative">
          <input
            type="number" min={5} step={5} value={svc.duration}
            onChange={e => set({ duration: Number(e.target.value) })}
            className="w-full text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
          />
          <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-stone-300 leading-none">min</span>
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
          <input
            type="number" min={0} step={5} value={svc.price}
            onChange={e => set({ price: Number(e.target.value) })}
            className="w-full text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg pl-5 pr-2 py-1.5 text-right focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
          />
        </div>
        <div className="relative">
          <input
            type="number" min={0} step={5} value={svc.processingGap}
            onChange={e => set({ processingGap: Number(e.target.value) })}
            title="Processing gap (min)"
            className="w-full text-xs text-stone-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-amber-400/60 transition-colors"
          />
          <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-amber-400 leading-none">gap</span>
        </div>
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          title="Edit description & image"
          className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${expanded ? "bg-[hsl(38,65%,55%)]/15 text-[hsl(38,65%,55%)]" : "text-stone-300 hover:text-stone-500 hover:bg-stone-100"}`}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* ── Expanded: description + image ── */}
      {expanded && (
        <div className="pb-4 pl-1 pr-1 space-y-3 animate-fade-in">
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Description (shown on booking page)</label>
            <textarea
              value={svc.description}
              onChange={e => set({ description: e.target.value })}
              rows={2}
              placeholder="Short description customers will see when browsing services…"
              className="w-full text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Service Photo</label>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
            <div className="flex items-center gap-3">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex-shrink-0">
                {svc.image ? (
                  <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-5 h-5 text-stone-300" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <button
                  onClick={() => imgRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-colors w-fit"
                >
                  <Image className="w-3 h-3" /> {svc.image ? "Replace Photo" : "Upload Photo"}
                </button>
                <input
                  value={svc.image}
                  onChange={e => set({ image: e.target.value })}
                  placeholder="Or paste an image URL…"
                  className="flex-1 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => set({ popular: !svc.popular })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${svc.popular ? "bg-[hsl(38,65%,55%)]/10 border-[hsl(38,65%,55%)]/30 text-[hsl(38,65%,45%)]" : "bg-stone-50 border-stone-200 text-stone-400"}`}
            >
              {svc.popular && <Check className="w-3 h-3" />}
              Popular badge
            </button>
            <span className="text-[10px] text-stone-300">Adds a "Popular" label on the booking page</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Category panel ────────────────────────────────────────────────────────────
function CategoryPanel({ category }: { category: ServiceCategory }) {
  const { services, addService, deleteService } = useServices();
  const [open, setOpen] = useState(true);
  const Icon = CATEGORY_ICONS[category];
  const catServices = services.filter(s => s.category === category);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-[hsl(38,65%,55%)]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[hsl(38,65%,55%)]" />
        </div>
        <span className="text-sm font-bold text-stone-800 flex-1 text-left">{CATEGORY_LABELS[category]}</span>
        <span className="text-xs text-stone-400 mr-2">{catServices.length} services</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-300" /> : <ChevronDown className="w-4 h-4 text-stone-300" />}
      </button>

      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          <div className="grid grid-cols-[1fr_76px_76px_84px_28px_28px] gap-2 mb-1 pb-2 border-b border-stone-100">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Service</span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-center">Duration</span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-center">Price</span>
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider text-center" title="Processing Gap">Gap</span>
            <span />
            <span />
          </div>

          {catServices.length === 0 && (
            <p className="text-xs text-stone-300 italic py-2">No services yet.</p>
          )}

          {catServices.map(svc => (
            <ServiceRow key={svc.id} svc={svc} onDelete={() => deleteService(svc.id)} />
          ))}

          <button
            onClick={() => addService(category)}
            className="mt-3 flex items-center gap-1.5 text-xs text-stone-400 hover:text-[hsl(38,65%,55%)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add service to {CATEGORY_LABELS[category]}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function HoursServicesTab() {
  const [hours, setHours] = useState(BUSINESS_HOURS_INIT);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-8">
      <SectionHead
        title="Hours & Services"
        sub="Set your business hours and manage every service offered — name, price, duration, photo, and description. Changes appear on the public booking page instantly."
      />

      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
        <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Processing Gap</span> — free minutes during chemical processing (e.g., color developing). Online booking allows a second client to start during this window, maximizing utilization.
        </p>
      </div>

      {/* Business hours */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-700">Business Hours</h3>
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {hours.map((h, i) => (
            <div key={h.day} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-stone-50" : ""}`}>
              <div className="w-28 flex-shrink-0">
                <p className="text-sm font-medium text-stone-700">{h.day}</p>
              </div>
              <button
                onClick={() => setHours(prev => prev.map((d, j) => j === i ? { ...d, closed: !d.closed } : d))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${h.closed ? "bg-stone-50 border-stone-200 text-stone-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${h.closed ? "bg-stone-300" : "bg-emerald-500"}`} />
                {h.closed ? "Closed" : "Open"}
              </button>
              {!h.closed && (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={h.open}
                    onChange={e => setHours(prev => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))}
                    className="w-28 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[hsl(38,65%,55%)]/60" />
                  <span className="text-stone-300 text-xs">–</span>
                  <input type="time" value={h.close}
                    onChange={e => setHours(prev => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))}
                    className="w-28 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[hsl(38,65%,55%)]/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-700">Services & Pricing</h3>
          <p className="text-[11px] text-stone-400">Click <ChevronDown className="w-3 h-3 inline" /> on a row to edit description & photo</p>
        </div>
        <div className="space-y-3">
          {CATEGORIES.map(cat => <CategoryPanel key={cat} category={cat} />)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? "bg-emerald-500 text-white" : "gradient-gold text-white hover:opacity-90"}`}
        >
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
        <p className="text-xs text-stone-400">Changes apply to new bookings immediately.</p>
      </div>
    </div>
  );
}
