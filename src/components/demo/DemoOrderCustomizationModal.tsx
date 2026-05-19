import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ShoppingCart } from "lucide-react";

export default function DemoOrderCustomizationModal() {
  const { pendingItem, setPendingItem, addItem, setCartTabRequested, customerInfo, setCustomerInfo } = useCart();
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [localName, setLocalName] = useState(customerInfo.name);
  const [localPhone, setLocalPhone] = useState(customerInfo.phone);
  const [localEmail, setLocalEmail] = useState(customerInfo.email);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  if (!pendingItem) return null;

  const validate = () => {
    const errs: { name?: string; phone?: string } = {};
    if (!localName.trim()) errs.name = "Name is required";
    if (!localPhone.trim()) errs.phone = "Phone number is required";
    else if (!/^[\d\s\-\+\(\)]{7,}$/.test(localPhone.trim())) errs.phone = "Enter a valid phone number";
    return errs;
  };

  const handleAdd = (openCart = false) => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setCustomerInfo({ name: localName.trim(), phone: localPhone.trim(), email: localEmail.trim() });
    addItem(pendingItem, specialInstructions.trim() || undefined);
    setPendingItem(null);
    if (openCart) setCartTabRequested(true);
  };

  return (
    <Dialog open onOpenChange={() => setPendingItem(null)}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Add to Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 border border-border rounded-lg p-3 bg-secondary/40">
          <p className="font-semibold text-foreground">{pendingItem.name}</p>
          <p className="text-gold text-sm font-medium">${Number(pendingItem.price).toFixed(2)}</p>
          {pendingItem.description && (
            <p className="text-muted-foreground text-xs leading-relaxed">{pendingItem.description}</p>
          )}
        </div>

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
              <Input
                value={localName}
                onChange={(e) => { setLocalName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Your full name"
                className={`bg-secondary border-border ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium text-foreground">Phone Number <span className="text-destructive">*</span></Label>
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

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => handleAdd(true)} className="w-full gradient-gold text-primary-foreground font-semibold">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add to Order &amp; View Cart
          </Button>
          <Button onClick={() => handleAdd(false)} variant="outline" className="w-full border-border text-foreground hover:bg-secondary">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Add &amp; Continue Browsing
          </Button>
          <Button variant="ghost" onClick={() => setPendingItem(null)} className="w-full text-muted-foreground text-sm">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
