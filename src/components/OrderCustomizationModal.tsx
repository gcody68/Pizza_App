import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart, type SelectedOptions } from "@/contexts/CartContext";
import type { MenuItem, ItemVariant } from "@/hooks/useMenuItems";
import { useClockedInStaff, useAvailableSlots } from "@/hooks/useStaff";
import { CalendarDays, Clock, Scissors, X, Loader as Loader2, User } from "lucide-react";
import { format, addDays } from "date-fns";

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getNextDays(count = 7) {
  return Array.from({ length: count }, (_, i) => addDays(new Date(), i));
}

const AVATAR_COLORS = [
  "#C9A84C", "#60A5FA", "#34D399", "#F87171", "#A78BFA", "#FB923C",
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

type Props = {
  item: MenuItem;
  initialVariant?: ItemVariant | null;
  onClose: () => void;
  isSalon?: boolean;
  restaurantId?: string | null;
};

// ── Salon bottom-sheet ────────────────────────────────────────────────────────
function SalonBottomSheet({ item, initialVariant, onClose, restaurantId }: Omit<Props, "isSalon">) {
  const { addItem, customerInfo, setCustomerInfo } = useCart();
  const { data: staffList = [] } = useClockedInStaff(restaurantId);

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

  // Stylist selection — null = "Anyone Available"
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const days = getNextDays(7);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Fetch available slots whenever date, staff, or service changes.
  // Pass the menu_item_id so the RPC can resolve per-staff duration overrides.
  const duration = item.duration_minutes ?? null;
  const { data: availableSlots, isLoading: slotsLoading } = useAvailableSlots(
    restaurantId,
    selectedDate,
    duration ?? 30,     // default fallback so query runs even when duration not set
    selectedStaffId,
    item.id,
  );

  // Reset time when date or stylist changes
  useEffect(() => { setSelectedTime(""); }, [selectedDate, selectedStaffId]);

  const [localName, setLocalName] = useState(customerInfo.name);
  const [localPhone, setLocalPhone] = useState(customerInfo.phone);
  const [localEmail, setLocalEmail] = useState(customerInfo.email);
  const [errors, setErrors] = useState<{
    name?: string; phone?: string; variant?: string;
    options?: Record<string, string>; date?: string; time?: string;
  }>({});

  // Sheet animation
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

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
    if (!selectedDate) errs.date = "Please select a date";
    if (!selectedTime) errs.time = "Please select a time slot";
    return errs;
  };

  const handleBook = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setCustomerInfo({ name: localName.trim(), phone: localPhone.trim(), email: localEmail.trim() });
    const opts = Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined;
    const chosenStaff = staffList.find((s) => s.id === selectedStaffId) ?? null;
    addItem(
      item,
      undefined,
      selectedVariant ?? undefined,
      opts,
      selectedDate,
      selectedTime,
      selectedStaffId ?? undefined,
      chosenStaff?.name ?? undefined,
    );
    handleClose();
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) ?? null;

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
            <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
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

          {/* ── Stylist selector ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Choose Stylist
            </Label>
            <div className="flex gap-2 flex-wrap">
              {/* Anyone available chip */}
              <button
                onClick={() => setSelectedStaffId(null)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                  selectedStaffId === null
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-secondary text-muted-foreground hover:border-gold/40 hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Anyone Available
              </button>

              {/* Per-stylist chips */}
              {staffList.map((staff, i) => {
                const color = staff.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length];
                const isSelected = selectedStaffId === staff.id;
                return (
                  <button
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                      isSelected
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-secondary text-muted-foreground hover:border-gold/40 hover:text-foreground"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials(staff.name)}
                    </span>
                    {staff.name}
                  </button>
                );
              })}

              {staffList.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No staff clocked in yet</p>
              )}
            </div>
          </div>

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
                    onClick={() => { setSelectedDate(key); setErrors((p) => ({ ...p, date: undefined })); }}
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

          {/* ── Time chips — dynamic from availability RPC ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Select Time <span className="text-destructive">*</span>
              {selectedStaff && (
                <span className="ml-auto text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
                  Showing availability for <span className="text-foreground font-medium">{selectedStaff.name}</span>
                </span>
              )}
            </Label>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !duration ? (
              // No duration set — show static fallback grid
              <p className="text-xs text-muted-foreground italic">No duration set for this service. Add one in the admin panel to enable availability checking.</p>
            ) : (availableSlots ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">No availability</p>
                <p className="text-xs text-muted-foreground">
                  {selectedStaff
                    ? `${selectedStaff.name} is fully booked on this date. Try a different day or choose "Anyone Available".`
                    : "All stylists are fully booked on this date. Please try another day."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {(availableSlots ?? []).map((slot) => (
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
            )}

            {errors.time && <p className="text-destructive text-xs">{errors.time}</p>}
            {selectedTime && duration && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-xl px-3 py-2.5 border border-border">
                <Clock className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>
                  <span className="text-foreground font-medium">{selectedTime}</span>
                  {" · "}Expected duration:{" "}
                  <span className="text-foreground font-medium">{formatDuration(duration)}</span>
                  {selectedStaff && (
                    <span className="text-muted-foreground"> · with <span className="text-foreground font-medium">{selectedStaff.name}</span></span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* ── Customer details ── */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Details</p>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Name <span className="text-destructive">*</span></Label>
              <Input
                value={localName}
                onChange={(e) => { setLocalName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Your full name"
                className={`bg-secondary border-border ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Phone <span className="text-destructive">*</span></Label>
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
function RestaurantDialog({ item, initialVariant, onClose }: Omit<Props, "isSalon" | "restaurantId">) {
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
          <DialogTitle className="font-serif text-gold">Add to Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 border border-border rounded-lg p-3 bg-secondary/40">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-gold text-sm font-medium">${displayPrice.toFixed(2)}</p>
          {item.description && <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>}
        </div>

        {variants.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Size <span className="text-destructive">*</span></Label>
            <Select value={selectedVariant?.label ?? ""} onValueChange={(val) => { setSelectedVariant(variants.find((v) => v.label === val) ?? null); setErrors((p) => ({ ...p, variant: undefined })); }}>
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
            <Select value={selectedOptions[group.label] ?? ""} onValueChange={(val) => { setSelectedOptions((prev) => ({ ...prev, [group.label]: val })); setErrors((p) => ({ ...p, options: { ...p.options, [group.label]: "" } })); }}>
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
            <Textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder="e.g. No onions, extra sauce..." className="bg-secondary border-border resize-none h-20 text-sm" />
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
export default function OrderCustomizationModal({ item, initialVariant, onClose, isSalon, restaurantId }: Props) {
  if (isSalon) {
    return <SalonBottomSheet item={item} initialVariant={initialVariant} onClose={onClose} restaurantId={restaurantId} />;
  }
  return <RestaurantDialog item={item} initialVariant={initialVariant} onClose={onClose} />;
}
