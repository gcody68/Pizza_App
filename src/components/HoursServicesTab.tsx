import { useState } from "react";
import { Clock, Scissors, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { SectionHead } from "@/pages/Dashboard";

interface ServiceItem {
  id: string;
  name: string;
  duration: number;     // minutes
  price: number;
  processingGap: number; // minutes — allows overlapping during chemical processing
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  services: ServiceItem[];
}

const INITIAL_CATEGORIES: Category[] = [
  {
    id: "cuts", label: "Cuts", icon: Scissors,
    services: [
      { id: "c1", name: "Women's Haircut & Style", duration: 60, price: 65, processingGap: 0 },
      { id: "c2", name: "Men's Haircut", duration: 30, price: 35, processingGap: 0 },
      { id: "c3", name: "Children's Haircut", duration: 30, price: 25, processingGap: 0 },
      { id: "c4", name: "Bang Trim", duration: 15, price: 15, processingGap: 0 },
    ],
  },
  {
    id: "color", label: "Color", icon: Clock,
    services: [
      { id: "col1", name: "Full Color", duration: 90, price: 95, processingGap: 30 },
      { id: "col2", name: "Root Touch-Up", duration: 60, price: 70, processingGap: 25 },
      { id: "col3", name: "Highlights / Balayage", duration: 150, price: 185, processingGap: 45 },
    ],
  },
  {
    id: "styling", label: "Styling", icon: Clock,
    services: [
      { id: "s1", name: "Blowout", duration: 45, price: 55, processingGap: 0 },
      { id: "s2", name: "Curling / Flat Iron Style", duration: 45, price: 55, processingGap: 0 },
      { id: "s3", name: "Special Occasion Updo", duration: 90, price: 110, processingGap: 0 },
    ],
  },
  {
    id: "treatments", label: "Treatments", icon: Clock,
    services: [
      { id: "t1", name: "Keratin Smoothing", duration: 150, price: 220, processingGap: 60 },
      { id: "t2", name: "Deep Conditioning", duration: 30, price: 40, processingGap: 0 },
      { id: "t3", name: "Scalp Treatment", duration: 30, price: 45, processingGap: 0 },
    ],
  },
];

const BUSINESS_HOURS = [
  { day: "Monday",    open: "09:00", close: "19:00", closed: false },
  { day: "Tuesday",   open: "09:00", close: "19:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "19:00", closed: false },
  { day: "Thursday",  open: "09:00", close: "20:00", closed: false },
  { day: "Friday",    open: "09:00", close: "20:00", closed: false },
  { day: "Saturday",  open: "09:00", close: "18:00", closed: false },
  { day: "Sunday",    open: "10:00", close: "17:00", closed: true  },
];

function ServiceRow({ svc, onUpdate, onDelete }: {
  svc: ServiceItem;
  onUpdate: (id: string, field: keyof ServiceItem, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 items-center py-2.5 border-b border-stone-50 last:border-0">
      <input
        value={svc.name}
        onChange={e => onUpdate(svc.id, "name", e.target.value)}
        className="text-sm font-medium text-stone-800 bg-transparent border-b border-transparent hover:border-stone-200 focus:border-[hsl(38,65%,55%)]/60 focus:outline-none py-0.5 px-0 transition-colors"
      />
      <div className="relative">
        <input
          type="number" min={5} step={5}
          value={svc.duration}
          onChange={e => onUpdate(svc.id, "duration", Number(e.target.value))}
          className="w-full text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
        />
        <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-stone-300 leading-none">min</span>
      </div>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">$</span>
        <input
          type="number" min={0} step={5}
          value={svc.price}
          onChange={e => onUpdate(svc.id, "price", Number(e.target.value))}
          className="w-full text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg pl-5 pr-2 py-1.5 text-right focus:outline-none focus:border-[hsl(38,65%,55%)]/60 transition-colors"
        />
      </div>
      <div className="relative">
        <input
          type="number" min={0} step={5}
          value={svc.processingGap}
          onChange={e => onUpdate(svc.id, "processingGap", Number(e.target.value))}
          title="Processing gap (min): allows overlapping bookings during chemical processing time"
          className="w-full text-xs text-stone-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-amber-400/60 transition-colors"
          placeholder="0"
        />
        <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] text-amber-400 leading-none">gap</span>
      </div>
      <button onClick={() => onDelete(svc.id)} className="w-6 h-6 flex items-center justify-center text-stone-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function CategoryPanel({ cat, onUpdate, onDelete, onAdd }: {
  cat: Category;
  onUpdate: (catId: string, svcId: string, field: keyof ServiceItem, value: string | number) => void;
  onDelete: (catId: string, svcId: string) => void;
  onAdd: (catId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const Icon = cat.icon;
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-stone-50/60 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-[hsl(38,65%,55%)]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[hsl(38,65%,55%)]" />
        </div>
        <span className="text-sm font-bold text-stone-800 flex-1 text-left">{cat.label}</span>
        <span className="text-xs text-stone-400 mr-2">{cat.services.length} services</span>
        {open ? <ChevronUp className="w-4 h-4 text-stone-300" /> : <ChevronDown className="w-4 h-4 text-stone-300" />}
      </button>

      {open && (
        <div className="px-5 pb-4 animate-fade-in">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-2 mb-1 pb-2 border-b border-stone-100">
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Service</span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-center">Duration</span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider text-center">Price</span>
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider text-center" title="Processing Gap: minutes of processing time during which another booking can start">Gap (min)</span>
            <span />
          </div>

          {cat.services.map(svc => (
            <ServiceRow key={svc.id} svc={svc}
              onUpdate={(id, field, val) => onUpdate(cat.id, id, field, val)}
              onDelete={id => onDelete(cat.id, id)} />
          ))}

          <button onClick={() => onAdd(cat.id)}
            className="mt-3 flex items-center gap-1.5 text-xs text-stone-400 hover:text-[hsl(38,65%,55%)] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add service to {cat.label}
          </button>
        </div>
      )}
    </div>
  );
}

export default function HoursServicesTab() {
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [hours, setHours] = useState(BUSINESS_HOURS);
  const [saved, setSaved] = useState(false);

  const updateService = (catId: string, svcId: string, field: keyof ServiceItem, value: string | number) => {
    setCategories(prev => prev.map(c =>
      c.id !== catId ? c : { ...c, services: c.services.map(s => s.id !== svcId ? s : { ...s, [field]: value }) }
    ));
  };
  const deleteService = (catId: string, svcId: string) => {
    setCategories(prev => prev.map(c =>
      c.id !== catId ? c : { ...c, services: c.services.filter(s => s.id !== svcId) }
    ));
  };
  const addService = (catId: string) => {
    const id = `new-${Date.now()}`;
    setCategories(prev => prev.map(c =>
      c.id !== catId ? c : { ...c, services: [...c.services, { id, name: "New Service", duration: 60, price: 75, processingGap: 0 }] }
    ));
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-8">
      <SectionHead title="Hours & Services" sub="Set your business hours and configure services with durations, pricing, and processing gaps for concurrent bookings." />

      {/* Info callout for processing gap */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50/70 border border-amber-200/60">
        <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Processing Gap</span> — the number of minutes a stylist's chair is free during chemical processing (e.g., color developing). Online booking will allow a second client to start during this window, maximizing utilization.
        </div>
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${h.closed ? "bg-stone-50 border-stone-200 text-stone-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${h.closed ? "bg-stone-300" : "bg-emerald-500"}`} />
                {h.closed ? "Closed" : "Open"}
              </button>
              {!h.closed && (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={h.open} onChange={e => setHours(prev => prev.map((d, j) => j === i ? { ...d, open: e.target.value } : d))}
                    className="w-28 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[hsl(38,65%,55%)]/60" />
                  <span className="text-stone-300 text-xs">–</span>
                  <input type="time" value={h.close} onChange={e => setHours(prev => prev.map((d, j) => j === i ? { ...d, close: e.target.value } : d))}
                    className="w-28 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[hsl(38,65%,55%)]/60" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service categories */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-stone-700">Services & Pricing</h3>
        <div className="space-y-3">
          {categories.map(cat => (
            <CategoryPanel key={cat.id} cat={cat}
              onUpdate={updateService} onDelete={deleteService} onAdd={addService} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${saved ? "bg-emerald-500 text-white" : "gradient-gold text-white hover:opacity-90"}`}>
          {saved ? "✓ Saved" : "Save Changes"}
        </button>
        <p className="text-xs text-stone-400">Changes apply to new bookings immediately.</p>
      </div>
    </div>
  );
}
