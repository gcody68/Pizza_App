import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart, type SelectedOptions } from "@/contexts/CartContext";
import type { MenuItem, ItemVariant } from "@/hooks/useMenuItems";
import { CalendarDays, Clock, Scissors, X, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";

// Half-hourly slots 9 AM – 6 PM
const TIME_SLOTS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM", "6:00 PM",
];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getNextDays(count = 7) {
  return Array.from({ length: count }, (_, i) => addDays(new Date(), i));
}

type Props = {
  item: MenuItem;
  initialVariant?: ItemVariant | null;
  onClose: () => void;
  isSalon?: boolean;
};

// ── Salon bottom-sheet ────────────────────────────────────────────────────────
function SalonBottomSheet({ item, initialVariant, onClose }: Omit<Props, "isSalon">) {
  const { addItem, customerInfo, setCustomerInfo } = useCart();

  const variants: ItemVariant[] = item.variants?.length ? item.variants : [];
  const optionGroups = item.options?.length ? item.options : [];
  const defaultVariant = initialVariant ?? variants.find((v) => v.isDefault) ?? variants[0] ?? null;

  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(defaultVariant);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() => {
    const init: SelectedOptions = {};
    for (const g of optionGroups) {
      if (g.required && g.choices.length > 0) init[g.label] = "";
    }
    return init;
  });

  const days = getNextDays(7);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [localName, setLocalName] = useState(customerInfo.name);
  const [localPhone, setLocalPhone] = useState(customerInfo.phone);
  const [localEmail, setLocalEmail] = useState(customerInfo.email);
  const [errors, setErrors] = useState<{
    name?: string; phone?: string; variant?: string;
    options?: Record<string, string>; date?: string; time?: string;
  }>({});

  // Sheet visibility animation
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const displayPrice = selectedVariant ? selectedVariant.price : Number(item.price);
  const duration = item.duration_minutes ?? null;

  const validate = () => {
    const errs: typeof errors = {};
    if (!localName.trim()) errs.name = "Name is required";
    if (!localPhone.trim()) errs.phone = "Phone number is required";
    else if (!/^[\d\s\-\+\(\)]{7,}$/.test(localPhone.trim())) errs.phone = "Enter a valid phone number";
    if (variants.length > 0 && !selectedVariant) errs.variant = "Please choose a size";
    const optErrs: Record<string, string> = {};
    for (const g of optionGroups) {
      if (g.required && !selectedOptions[g.label]) optErrs[g.label] = `Please choose a ${g.label.toLowerCase()}`;
    }
    if (Object.keys(optErrs).length > 0) errs.options = optErrs;
    if (!selectedDate) errs.date = "Please select a date";
    if (!selectedTime) errs.time = "Please select a time slot";
    return errs;
  };

  const handleBook = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setCustomerInfo({ name: localName.trim(), phone: localPhone.trim(), email: localEmail.trim() });
    const opts = Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined;
    addItem(item, undefined, selectedVariant ?? undefined, opts, selectedDate, selectedTime);
    handleClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-card rounded-t-2xl shadow-2xl transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] max-h-[92dvh] ${visible ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-1 pb-3 border-b border-border flex-shrink-0">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-foreground text-base leading-tight truncate">{item.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-gold font-semibold text-sm">${displayPrice.toFixed(2)}</span>
              {duration && (
                <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
                  <Clock className="w-3 h-3" />{formatDuration(duration)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

          {/* Variant picker */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Size <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedVariant?.label ?? ""}
                onValueChange={(val) => {
                  setSelectedVariant(variants.find((v) => v.label === val) ?? null);
                  setErrors((p) => ({ ...p, variant: undefined }));
                }}
              >
                <SelectTrigger className={`bg-secondary border-border ${errors.variant ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Choose a size..." />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v) => (
                    <SelectItem key={v.label} value={v.label}>{v.label} — ${v.price.toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.variant && <p className="text-destructive text-xs">{errors.variant}</p>}
            </div>
          )}

          {/* Option groups */}
          {optionGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}{group.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select
                value={selectedOptions[group.label] ?? ""}
                onValueChange={(val) => {
                  setSelectedOptions((prev) => ({ ...prev, [group.label]: val }));
                  setErrors((p) => ({ ...p, options: { ...p.options, [group.label]: "" } }));
                }}
              >
                <SelectTrigger className={`bg-secondary border-border ${errors.options?.[group.label] ? "border-destructive" : ""}`}>
                  <SelectValue placeholder={`Choose ${group.label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {group.choices.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.options?.[group.label] && <p className="text-destructive text-xs">{errors.options[group.label]}</p>}
            </div>
          ))}

          {/* ── Date strip ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Select Date <span className="text-destructive">*</span>
            </Label>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const isSelected = selectedDate === key;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedDate(key); setSelectedTime(""); setErrors((p) => ({ ...p, date: undefined })); }}
                    className={`flex-shrink-0 flex flex-col items-center gap-0.5 w-14 py-2.5 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-secondary text-muted-foreground hover:border-gold/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide">{isToday ? "Today" : format(day, "EEE")}</span>
                    <span className="text-xl font-bold leading-none">{format(day, "d")}</span>
                    <span className="text-[9px] opacity-60">{format(day, "MMM")}</span>
                  </button>
                );
              })}
            </div>
            {errors.date && <p className="text-destructive text-xs">{errors.date}</p>}
          </div>

          {/* ── Time chips ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Select Time <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => { setSelectedTime(slot); setErrors((p) => ({ ...p, time: undefined })); }}
                  className={`px-1.5 py-2 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                    selectedTime === slot
                      ? "border-gold bg-gold/15 text-gold font-semibold"
                      : "border-border bg-secondary text-muted-foreground hover:border-gold/40 hover:text-foreground"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            {errors.time && <p className="text-destructive text-xs">{errors.time}</p>}
            {selectedTime && duration && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-xl px-3 py-2.5 border border-border mt-1">
                <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>
                  <span className="text-foreground font-medium">{selectedTime}</span>
                  {" · "}Expected duration: <span className="text-foreground font-medium">{formatDuration(duration)}</span>
                </span>
              </div>
            )}
          </div>

          {/* ── Customer details ── */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Details</p>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={localName}
                onChange={(e) => { setLocalName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Your full name"
                className={`bg-secondary border-border ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                value={localPhone}
                onChange={(e) => { setLocalPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                placeholder="(555) 123-4567"
                type="tel"
                className={`bg-secondary border-border ${errors.phone ? "border-destructive" : ""}`}
              />
              {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">
                Email <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                className="bg-secondary border-border"
              />
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="flex-shrink-0 px-4 pt-3 pb-6 border-t border-border bg-card/95 backdrop-blur-sm">
          <button
            onClick={handleBook}
            className="w-full gradient-gold text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-base hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Scissors className="w-4 h-4" />
            Book Appointment
            {selectedTime && selectedDate && (
              <span className="text-xs font-normal opacity-80 ml-1">
                · {format(new Date(selectedDate + "T00:00"), "MMM d")} at {selectedTime}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Restaurant dialog (unchanged) ─────────────────────────────────────────────
function RestaurantDialog({ item, initialVariant, onClose }: Omit<Props, "isSalon">) {
  const { addItem, customerInfo, setCustomerInfo } = useCart();

  const variants: ItemVariant[] = item.variants?.length ? item.variants : [];
  const optionGroups = item.options?.length ? item.options : [];
  const defaultVariant = initialVariant ?? variants.find((v) => v.isDefault) ?? variants[0] ?? null;

  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(defaultVariant);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() => {
    const init: SelectedOptions = {};
    for (const g of optionGroups) {
      if (g.required && g.choices.length > 0) init[g.label] = "";
    }
    return init;
  });
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [localName, setLocalName] = useState(customerInfo.name);
  const [localPhone, setLocalPhone] = useState(customerInfo.phone);
  const [localEmail, setLocalEmail] = useState(customerInfo.email);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; variant?: string; options?: Record<string, string> }>({});

  const displayPrice = selectedVariant ? selectedVariant.price : Number(item.price);

  const validate = () => {
    const errs: typeof errors = {};
    if (!localName.trim()) errs.name = "Name is required";
    if (!localPhone.trim()) errs.phone = "Phone number is required";
    else if (!/^[\d\s\-\+\(\)]{7,}$/.test(localPhone.trim())) errs.phone = "Enter a valid phone number";
    if (variants.length > 0 && !selectedVariant) errs.variant = "Please choose a size";
    const optErrs: Record<string, string> = {};
    for (const g of optionGroups) {
      if (g.required && !selectedOptions[g.label]) optErrs[g.label] = `Please choose a ${g.label.toLowerCase()}`;
    }
    if (Object.keys(optErrs).length > 0) errs.options = optErrs;
    return errs;
  };

  const handleAddToOrder = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setCustomerInfo({ name: localName.trim(), phone: localPhone.trim(), email: localEmail.trim() });
    addItem(item, specialInstructions.trim() || undefined, selectedVariant ?? undefined,
      Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            Add to Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 border border-border rounded-lg p-3 bg-secondary/40">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-gold text-sm font-medium">${displayPrice.toFixed(2)}</p>
          {item.description && <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>}
        </div>

        {variants.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Size <span className="text-destructive">*</span></Label>
            <Select
              value={selectedVariant?.label ?? ""}
              onValueChange={(val) => { setSelectedVariant(variants.find((v) => v.label === val) ?? null); setErrors((p) => ({ ...p, variant: undefined })); }}
            >
              <SelectTrigger className={`bg-secondary border-border ${errors.variant ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Choose a size..." />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => <SelectItem key={v.label} value={v.label}>{v.label} — ${v.price.toFixed(2)}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.variant && <p className="text-destructive text-xs">{errors.variant}</p>}
          </div>
        )}

        {optionGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              {group.label}{group.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={selectedOptions[group.label] ?? ""}
              onValueChange={(val) => { setSelectedOptions((prev) => ({ ...prev, [group.label]: val })); setErrors((p) => ({ ...p, options: { ...p.options, [group.label]: "" } })); }}
            >
              <SelectTrigger className={`bg-secondary border-border ${errors.options?.[group.label] ? "border-destructive" : ""}`}>
                <SelectValue placeholder={`Choose ${group.label.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {group.choices.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.options?.[group.label] && <p className="text-destructive text-xs">{errors.options[group.label]}</p>}
          </div>
        ))}

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-foreground">
              Special Instructions <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. No onions, extra sauce, allergy info..."
              className="bg-secondary border-border resize-none h-20 text-sm"
            />
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Details</p>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Name <span className="text-destructive">*</span></Label>
              <Input value={localName} onChange={(e) => { setLocalName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }} placeholder="Your full name" className={`bg-secondary border-border ${errors.name ? "border-destructive" : ""}`} />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Phone Number <span className="text-destructive">*</span></Label>
              <Input value={localPhone} onChange={(e) => { setLocalPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }} placeholder="(555) 123-4567" type="tel" className={`bg-secondary border-border ${errors.phone ? "border-destructive" : ""}`} />
              {errors.phone && <p className="text-destructive text-xs">{errors.phone}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Email <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} placeholder="you@example.com" type="email" className="bg-secondary border-border" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-muted-foreground">Cancel</Button>
          <Button onClick={handleAddToOrder} className="flex-1 gradient-gold text-primary-foreground font-semibold">
            {selectedVariant ? `Add ${selectedVariant.label} — $${selectedVariant.price.toFixed(2)}` : "Add to Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Route to correct variant ──────────────────────────────────────────────────
export default function OrderCustomizationModal({ item, initialVariant, onClose, isSalon }: Props) {
  if (isSalon) {
    return <SalonBottomSheet item={item} initialVariant={initialVariant} onClose={onClose} />;
  }
  return <RestaurantDialog item={item} initialVariant={initialVariant} onClose={onClose} />;
}
