import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart, type SelectedOptions } from "@/contexts/CartContext";
import type { MenuItem, ItemVariant } from "@/hooks/useMenuItems";
import { ShoppingBag } from "lucide-react";

type Props = {
  item: MenuItem;
  initialVariant?: ItemVariant | null;
  onClose: () => void;
};

export default function OrderCustomizationModal({ item, initialVariant, onClose }: Props) {
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
      if (g.required && !selectedOptions[g.label]) {
        optErrs[g.label] = `Please choose a ${g.label.toLowerCase()}`;
      }
    }
    if (Object.keys(optErrs).length > 0) errs.options = optErrs;

    return errs;
  };

  const handleAddToOrder = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setCustomerInfo({ name: localName.trim(), phone: localPhone.trim(), email: localEmail.trim() });
    const opts = Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined;
    addItem(item, specialInstructions.trim() || undefined, selectedVariant ?? undefined, opts);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Add to Order
          </DialogTitle>
        </DialogHeader>

        {/* Item summary */}
        <div className="space-y-1 border border-border rounded-lg p-3 bg-secondary/40">
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-gold text-sm font-medium">${displayPrice.toFixed(2)}</p>
          {item.description && (
            <p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Size dropdown */}
        {variants.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              Size <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedVariant?.label ?? ""}
              onValueChange={(val) => {
                const v = variants.find((v) => v.label === val) ?? null;
                setSelectedVariant(v);
                setErrors((p) => ({ ...p, variant: undefined }));
              }}
            >
              <SelectTrigger className={`bg-secondary border-border ${errors.variant ? "border-destructive" : ""}`}>
                <SelectValue placeholder="Choose a size..." />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.label} value={v.label}>
                    {v.label} — ${v.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.variant && <p className="text-destructive text-xs">{errors.variant}</p>}
          </div>
        )}

        {/* Option group dropdowns */}
        {optionGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              {group.label}
              {group.required && <span className="text-destructive ml-1">*</span>}
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
                {group.choices.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.options?.[group.label] && (
              <p className="text-destructive text-xs">{errors.options[group.label]}</p>
            )}
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
                Phone Number <span className="text-destructive">*</span>
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
                Email Address <span className="text-muted-foreground font-normal text-xs">(optional)</span>
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

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-muted-foreground">
            Cancel
          </Button>
          <Button onClick={handleAddToOrder} className="flex-1 gradient-gold text-primary-foreground font-semibold">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {selectedVariant
              ? `Add ${selectedVariant.label} — $${selectedVariant.price.toFixed(2)}`
              : "Add to Order"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
