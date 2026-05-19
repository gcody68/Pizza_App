import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useRestaurantSettings, isSalonBusiness } from "@/hooks/useRestaurantSettings";
import { useDecrementStock } from "@/hooks/useMenuItems";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Minus, Plus, Trash2, ShoppingBag, Loader as Loader2, CircleCheck as CheckCircle2, CreditCard, Lock, MessageSquare, Bitcoin, Copy, CheckCheck, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Time slots available for salon appointments (hourly, 9 AM – 6 PM)
const APPOINTMENT_SLOTS = [
  "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM",
];

type Step = "cart" | "appointment" | "checkout" | "payment" | "crypto" | "confirmation";

function TaxBreakdown({ subtotal, taxRate, taxAmount, grandTotal, size = "lg" }: {
  subtotal: number; taxRate: number; taxAmount: number; grandTotal: number; size?: "sm" | "lg";
}) {
  const textSize = size === "sm" ? "text-sm" : "text-base";
  const totalSize = size === "sm" ? "text-base" : "text-lg";
  if (taxRate <= 0) {
    return (
      <div className={`flex justify-between ${totalSize} font-semibold`}>
        <span className="text-foreground">Total</span>
        <span className="text-gold">${grandTotal.toFixed(2)}</span>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className={`flex justify-between ${textSize} text-muted-foreground`}>
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>
      <div className={`flex justify-between ${textSize} text-muted-foreground`}>
        <span>Sales Tax ({taxRate}%)</span>
        <span>${taxAmount.toFixed(2)}</span>
      </div>
      <div className={`flex justify-between ${totalSize} font-semibold pt-1.5 border-t border-border`}>
        <span className="text-foreground">Total</span>
        <span className="text-gold">${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

const stripePromiseCache: Record<string, Promise<Stripe | null>> = {};
function getStripePromise(publicKey: string) {
  if (!stripePromiseCache[publicKey]) {
    stripePromiseCache[publicKey] = loadStripe(publicKey);
  }
  return stripePromiseCache[publicKey];
}

interface StripeCardFormProps {
  grandTotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  customerName: string;
  customerEmail: string;
  restaurantId: string;
  submitting: boolean;
  onSuccess: () => Promise<void>;
  setSubmitting: (v: boolean) => void;
  onBack: () => void;
}

function StripeCardForm({ grandTotal, subtotal, taxRate, taxAmount, customerName, customerEmail, restaurantId, submitting, onSuccess, setSubmitting, onBack }: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) {
      toast.error("Payment not ready — please wait a moment and try again.");
      return;
    }
    const cardElement = elements.getElement(CardElement) as StripeCardElement | null;
    if (!cardElement) {
      toast.error("Card field not found — please refresh and try again.");
      return;
    }
    setSubmitting(true);
    setCardError("");
    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: customerName || undefined,
          email: customerEmail || undefined,
        },
      });
      if (pmError) {
        console.error("[Stripe] createPaymentMethod error:", pmError);
        setCardError(pmError.message || "Card error");
        setSubmitting(false);
        return;
      }
      console.log("[Stripe] PaymentMethod created:", paymentMethod.id);
      const amountCents = Math.round(grandTotal * 100);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      console.log("[Payment] Calling edge function, amount:", amountCents, "restaurant:", restaurantId);
      const res = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anonKey}` },
        body: JSON.stringify({ restaurantId, amountCents, paymentMethodId: paymentMethod.id, customerName, customerEmail: customerEmail || undefined }),
      });
      const result = await res.json();
      console.log("[Payment] Edge function response:", res.status, result);
      if (!res.ok || result.error) {
        setCardError(result.error || "Payment failed. Please check your card details.");
        setSubmitting(false);
        return;
      }
      if (result.requiresAction && result.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) {
          console.error("[Stripe] confirmCardPayment error:", confirmError);
          setCardError(confirmError.message || "Payment authentication failed.");
          setSubmitting(false);
          return;
        }
      }
      console.log("[Payment] Success — placing order");
      await onSuccess();
    } catch (err) {
      console.error("[Payment] Unexpected error:", err);
      toast.error("Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        color: "#e8d5a3",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "15px",
        "::placeholder": { color: "#6b7280" },
        iconColor: "#c9a84c",
      },
      invalid: { color: "#ef4444", iconColor: "#ef4444" },
    },
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Card Details</Label>
        <div className="rounded-md border border-border bg-secondary px-3 py-3">
          <CardElement options={cardElementOptions} onChange={(e) => { if (e.error) setCardError(e.error.message); else setCardError(""); }} />
        </div>
        {cardError && <p className="text-destructive text-xs">{cardError}</p>}
      </div>

      <div className="border-t border-border pt-4">
        <TaxBreakdown subtotal={subtotal} taxRate={taxRate} taxAmount={taxAmount} grandTotal={grandTotal} />
      </div>

      <div className="mt-auto space-y-3 pb-4">
        <Button
          onClick={handlePay}
          disabled={submitting || !stripe}
          className="w-full gradient-gold text-primary-foreground font-semibold h-12 text-base"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay $${grandTotal.toFixed(2)}`}
        </Button>
        <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground" disabled={submitting}>
          Back
        </Button>
      </div>
    </div>
  );
}

export default function CartSidebar({ restaurantId }: { restaurantId?: string | null }) {
  const { items, updateQuantity, removeItem, clearCart, total, isOpen, setIsOpen, customerInfo, setCustomerInfo } = useCart();
  const { data: settings, isLoading: settingsLoading } = useRestaurantSettings(restaurantId);
  const isSalon = isSalonBusiness(settings);
  const [step, setStep] = useState<Step>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  // For salon mode, appointment date/time come from the first cart item (set in the booking modal).
  // The standalone appointment step is only shown as fallback when items lack this data.
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [apptDateError, setApptDateError] = useState("");
  const [apptTimeError, setApptTimeError] = useState("");
  const paymentCompletedRef = useRef(false);

  const demo = useDemoMode();
  const { isOrderCapReached, isUnpaid } = useSubscription();
  const checkoutBlocked = isOrderCapReached || isUnpaid;
  const paymentEnabled = settings?.payment_enabled ?? false;
  const taxRate = settings?.sales_tax_rate ?? 0;
  const taxAmount = total * (taxRate / 100);
  const grandTotal = total + taxAmount;
  const [cryptoCopied, setCryptoCopied] = useState(false);
  // Crypto wallet stored in stripe_public_key field when crypto is enabled
  // (we reuse the existing column; in a future schema migration this would be its own column)
  const cryptoAddress = (settings as (typeof settings & { crypto_address?: string | null }))?.crypto_address ?? null;
  const decrementStock = useDecrementStock();

  const validateCheckout = () => {
    let valid = true;
    if (!customerInfo.name.trim()) { setNameError("Name is required"); valid = false; }
    else setNameError("");
    if (!customerInfo.phone.trim()) { setPhoneError("Phone is required"); valid = false; }
    else setPhoneError("");
    return valid;
  };

  const validateAppointment = () => {
    let valid = true;
    if (!appointmentDate) { setApptDateError("Please select a date"); valid = false; }
    else setApptDateError("");
    if (!appointmentTime) { setApptTimeError("Please select a time slot"); valid = false; }
    else setApptTimeError("");
    return valid;
  };

  const handlePlaceOrder = async () => {
    console.log("[Cart] handlePlaceOrder — settingsLoading:", settingsLoading, "payment_enabled:", settings?.payment_enabled, "demo:", !!demo);
    if (!validateCheckout()) return;
    if (settingsLoading) {
      toast.error("Please wait a moment and try again.");
      return;
    }
    if (isSalon) {
      // If the booked item already carries date/time from the modal, use those.
      const firstItem = items[0];
      if (firstItem?.appointmentDate && firstItem?.appointmentTime) {
        setAppointmentDate(firstItem.appointmentDate);
        setAppointmentTime(firstItem.appointmentTime);
        if (settings?.payment_enabled) { setStep("payment"); return; }
        await submitOrder(firstItem.appointmentDate, firstItem.appointmentTime);
        return;
      }
      // Fallback: show the standalone appointment picker step.
      setStep("appointment");
      return;
    }
    if (settings?.payment_enabled) { setStep("payment"); return; }
    await submitOrder();
  };

  const handleAppointmentNext = () => {
    if (!validateAppointment()) return;
    if (settings?.payment_enabled) { setStep("payment"); return; }
    submitOrder(appointmentDate, appointmentTime);
  };

  const upsertCustomerLead = async () => {
    if (!customerInfo.phone.trim()) return;
    await supabase.rpc("upsert_customer_lead", {
      p_name: customerInfo.name.trim(),
      p_phone: customerInfo.phone.trim(),
      p_email: customerInfo.email.trim() || null,
    });
  };

  const submitOrder = async (overrideDate?: string, overrideTime?: string) => {
    console.log("[Cart] submitOrder — payment_enabled:", settings?.payment_enabled, "paymentCompleted:", paymentCompletedRef.current, "demo:", !!demo);
    // If payment is required, it must have been completed via Stripe before this runs
    if (settings?.payment_enabled && !paymentCompletedRef.current) {
      toast.error("Payment must be completed before placing the order.");
      return;
    }
    setSubmitting(true);
    try {
      if (demo) {
        demo.submitOrder({
          customerName: customerInfo.name.trim(),
          customerPhone: customerInfo.phone.trim(),
          items: items.map((i) => ({ name: i.menuItem.name, qty: i.quantity, price: Number(i.menuItem.price) })),
          total: grandTotal,
        });
        setStep("confirmation");
        clearCart();
        return;
      }

      if (!restaurantId) throw new Error("Restaurant not identified. Please refresh and try again.");

      const orderItems = items.map((i) => {
        const optionText = i.selectedOptions
          ? Object.entries(i.selectedOptions)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        const variantText = i.selectedVariant ? `Size: ${i.selectedVariant.label}` : "";
        const extras = [variantText, optionText].filter(Boolean).join(" | ");
        const instructions = [extras, i.specialInstructions].filter(Boolean).join(" — ") || null;
        return {
          menu_item_id: i.menuItem.id,
          menu_item_name: i.menuItem.name,
          price: i.selectedVariant ? i.selectedVariant.price : Number(i.menuItem.price),
          quantity: i.quantity,
          special_instructions: instructions,
        };
      });

      const { error: orderErr } = await supabase.rpc("place_order", {
        p_restaurant_id: restaurantId,
        p_customer_name: customerInfo.name.trim(),
        p_customer_phone: customerInfo.phone.trim(),
        p_customer_email: customerInfo.email.trim() || null,
        p_total: grandTotal,
        p_items: orderItems,
        p_appointment_date: (overrideDate || appointmentDate) || null,
        p_appointment_time: (overrideTime || appointmentTime) || null,
        p_staff_id: items[0]?.staffId ?? null,
      });
      if (orderErr) throw orderErr;

      await upsertCustomerLead();

      const stockItems = items
        .filter((i) => i.menuItem.daily_stock != null)
        .map((i) => ({ id: i.menuItem.id, quantity: i.quantity }));
      if (stockItems.length > 0) {
        try { await decrementStock.mutateAsync(stockItems); } catch { /* non-critical */ }
      }

      setStep("confirmation");
      clearCart();
    } catch (err) {
      console.error("Order submission error:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("cart");
      setNameError("");
      setPhoneError("");
      setApptDateError("");
      setApptTimeError("");
      setAppointmentDate("");
      setAppointmentTime("");
      setCryptoCopied(false);
      paymentCompletedRef.current = false;
    }, 300);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="bg-card border-border flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-gold flex items-center gap-2">
            {isSalon ? <CalendarDays className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            {step === "confirmation"
              ? (isSalon ? "Appointment Booked!" : "Order Confirmed")
              : step === "appointment"
                ? "Choose Appointment"
                : step === "payment"
                  ? "Secure Payment"
                  : step === "crypto"
                    ? "Pay with Crypto"
                    : isSalon ? "Your Services" : "Your Order"}
          </SheetTitle>
        </SheetHeader>

        {step === "confirmation" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-4">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.business_name || "Logo"}
                className="h-16 max-w-[200px] object-contain mb-2"
              />
            ) : (
              <span className="font-serif text-2xl font-semibold text-gold" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {settings?.business_name || "Restaurant"}
              </span>
            )}
            <CheckCircle2 className="w-14 h-14 text-gold" />
            <h3 className="text-2xl font-serif font-bold text-foreground">
              {isSalon ? "Appointment Booked!" : "Order Placed!"}
            </h3>
            {isSalon && (() => {
              const d = appointmentDate || items[0]?.appointmentDate || "";
              const t = appointmentTime || items[0]?.appointmentTime || "";
              const stylist = items[0]?.staffName || "";
              if (!d && !t) return null;
              return (
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-3 bg-secondary/60 rounded-lg px-4 py-3 text-sm">
                    <CalendarDays className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="text-foreground font-medium">{d}</span>
                    <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                    <span className="text-foreground font-medium">{t}</span>
                  </div>
                  {stylist && (
                    <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground text-xs">Stylist:</span>
                      <span className="text-foreground font-semibold">{stylist}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <p className="text-muted-foreground leading-relaxed">
              {isSalon
                ? (paymentEnabled ? "Payment processed. See you then!" : "We look forward to seeing you. Please arrive a few minutes early.")
                : (paymentEnabled ? "Payment processed. Your order is being prepared." : "Please pay when you arrive for pickup.")}
            </p>
            <Button onClick={handleClose} className="mt-6 gradient-gold text-primary-foreground font-semibold">
              Done
            </Button>
          </div>

        ) : step === "crypto" ? (
          <div className="flex-1 flex flex-col gap-6 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <Bitcoin className="w-3.5 h-3.5 text-amber-400" />
              Send the exact total in crypto to the address below
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(cryptoAddress ?? "")}&bgcolor=1a1a1a&color=c9a84c&format=png`}
                  alt="Crypto QR"
                  className="w-36 h-36 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
                <code className="text-xs text-foreground flex-1 truncate font-mono">{cryptoAddress}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(cryptoAddress ?? ""); setCryptoCopied(true); setTimeout(() => setCryptoCopied(false), 2000); }}
                  className="flex-shrink-0 text-xs text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
                >
                  {cryptoCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {cryptoCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="pt-1 border-t border-border">
                <TaxBreakdown subtotal={total} taxRate={taxRate} taxAmount={taxAmount} grandTotal={grandTotal} />
              </div>
            </div>
            <div className="mt-auto space-y-3 pb-4">
              <Button
                onClick={submitOrder}
                disabled={submitting}
                className="w-full gradient-gold text-primary-foreground font-semibold h-12"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've Sent Payment"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("checkout")} className="w-full text-muted-foreground">
                Back
              </Button>
            </div>
          </div>

        ) : step === "appointment" ? (
          <div className="flex-1 flex flex-col gap-6 pt-4 overflow-y-auto">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
              <CalendarDays className="w-3.5 h-3.5 text-gold" />
              Select a date and time for your appointment
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Appointment Date <span className="text-destructive">*</span>
                </Label>
                <input
                  type="date"
                  value={appointmentDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setAppointmentDate(e.target.value); setApptDateError(""); }}
                  className={`w-full bg-secondary border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-gold/60 transition-colors ${apptDateError ? "border-destructive" : "border-border"}`}
                />
                {apptDateError && <p className="text-destructive text-xs">{apptDateError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time Slot <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {APPOINTMENT_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => { setAppointmentTime(slot); setApptTimeError(""); }}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        appointmentTime === slot
                          ? "bg-gold/20 border-gold/60 text-gold"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-gold/30"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {apptTimeError && <p className="text-destructive text-xs">{apptTimeError}</p>}
              </div>
            </div>

            <div className="mt-auto space-y-3 pb-4">
              <Button
                onClick={handleAppointmentNext}
                disabled={submitting || settingsLoading}
                className="w-full gradient-gold text-primary-foreground font-semibold h-12 text-base"
              >
                {submitting || settingsLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : settings?.payment_enabled
                    ? <><CreditCard className="w-4 h-4 mr-2" /> Continue to Payment</>
                    : "Confirm Appointment"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("checkout")} className="w-full text-muted-foreground">
                Back
              </Button>
            </div>
          </div>

        ) : step === "payment" ? (
          <div className="flex-1 flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
              <Lock className="w-3.5 h-3.5 text-gold" />
              Secure encrypted payment — powered by Stripe
            </div>

            {settings?.stripe_public_key ? (
              <Elements stripe={getStripePromise(settings.stripe_public_key)}>
                <StripeCardForm
                  grandTotal={grandTotal}
                  subtotal={total}
                  taxRate={taxRate}
                  taxAmount={taxAmount}
                  customerName={customerInfo.name.trim()}
                  customerEmail={customerInfo.email.trim()}
                  restaurantId={restaurantId ?? ""}
                  submitting={submitting}
                  onSuccess={async () => {
                    paymentCompletedRef.current = true;
                    await submitOrder();
                  }}
                  setSubmitting={setSubmitting}
                  onBack={() => setStep("checkout")}
                />
              </Elements>
            ) : (
              <div className="flex flex-col gap-4 flex-1">
                <p className="text-sm text-destructive">Payment is not configured for this restaurant.</p>
                <Button variant="ghost" onClick={() => setStep("checkout")} className="w-full text-muted-foreground mt-auto mb-4">
                  Back
                </Button>
              </div>
            )}
          </div>

        ) : step === "checkout" ? (
          <div className="flex-1 flex flex-col gap-6 pt-4 overflow-y-auto">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Details</p>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={customerInfo.name}
                  onChange={(e) => { setCustomerInfo({ ...customerInfo, name: e.target.value }); setNameError(""); }}
                  placeholder="Enter your name"
                  className={`bg-secondary border-border ${nameError ? "border-destructive" : ""}`}
                  autoFocus
                />
                {nameError && <p className="text-destructive text-xs">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={customerInfo.phone}
                  onChange={(e) => { setCustomerInfo({ ...customerInfo, phone: e.target.value }); setPhoneError(""); }}
                  placeholder="(555) 123-4567"
                  className={`bg-secondary border-border ${phoneError ? "border-destructive" : ""}`}
                  type="tel"
                />
                {phoneError && <p className="text-destructive text-xs">{phoneError}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">
                  Email <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  placeholder="you@example.com"
                  type="email"
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isSalon ? "Appointment Summary" : "Order Summary"}</p>
              {items.map((ci) => {
                const linePrice = ci.selectedVariant ? ci.selectedVariant.price : Number(ci.menuItem.price);
                return (
                  <div key={ci.lineKey} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground font-medium flex items-center gap-1.5 flex-wrap">
                        <span className="text-gold font-semibold">{ci.quantity}×</span>
                        {ci.menuItem.name}
                        {ci.selectedVariant && (
                          <span className="text-[10px] font-semibold bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.5 rounded-full">
                            {ci.selectedVariant.label}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">${(linePrice * ci.quantity).toFixed(2)}</span>
                    </div>
                    {ci.selectedOptions && Object.entries(ci.selectedOptions).filter(([,v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5 ml-4">
                        <p className="text-xs text-muted-foreground">{k}: <span className="text-foreground">{v}</span></p>
                      </div>
                    ))}
                    {ci.staffName && (
                      <div className="flex items-center gap-1.5 ml-4">
                        <p className="text-xs text-muted-foreground">Stylist: <span className="text-foreground font-medium">{ci.staffName}</span></p>
                      </div>
                    )}
                    {ci.appointmentDate && ci.appointmentTime && (
                      <div className="flex items-center gap-1.5 ml-4">
                        <CalendarDays className="w-3 h-3 text-gold flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">{ci.appointmentDate} at <span className="text-foreground font-medium">{ci.appointmentTime}</span></p>
                      </div>
                    )}
                    {ci.specialInstructions && (
                      <div className="flex items-start gap-1.5 ml-4">
                        <MessageSquare className="w-3 h-3 text-gold mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic">{ci.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border">
                <TaxBreakdown subtotal={total} taxRate={taxRate} taxAmount={taxAmount} grandTotal={grandTotal} />
              </div>
            </div>

            <div className="mt-auto space-y-3 pb-4">
              <Button
                onClick={handlePlaceOrder}
                disabled={submitting || settingsLoading}
                className="w-full gradient-gold text-primary-foreground font-semibold h-12 text-base"
              >
                {submitting || settingsLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : settings?.payment_enabled
                    ? <><CreditCard className="w-4 h-4 mr-2" />Pay by Card</>
                    : isSalon ? "Choose Appointment Time" : "Place Order (Pay in Person)"
                }
              </Button>
              {cryptoAddress && (
                <Button
                  variant="outline"
                  onClick={() => { if (!validateCheckout()) return; setStep("crypto"); }}
                  className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-10"
                >
                  <Bitcoin className="w-4 h-4 mr-2" /> Pay with Crypto
                </Button>
              )}
              <Button variant="ghost" onClick={() => setStep("cart")} className="w-full text-muted-foreground">
                Back to Cart
              </Button>
            </div>
          </div>

        ) : (
          <div className="flex-1 flex flex-col">
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <ShoppingBag className="w-12 h-12 opacity-30" />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {items.map((ci) => {
                    const linePrice = ci.selectedVariant ? ci.selectedVariant.price : Number(ci.menuItem.price);
                    return (
                      <div key={ci.lineKey} className="bg-secondary rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-3">
                          {ci.menuItem.image_url && (
                            <img
                              src={ci.menuItem.image_url}
                              alt={ci.menuItem.name}
                              className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{ci.menuItem.name}</p>
                            {ci.selectedVariant && (
                              <span className="inline-block text-[10px] font-semibold bg-gold/15 text-gold border border-gold/30 px-1.5 py-0.5 rounded-full mb-0.5">
                                {ci.selectedVariant.label}
                              </span>
                            )}
                            <p className="text-gold text-sm">${linePrice.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(ci.lineKey, ci.quantity - 1)}
                              className="w-7 h-7 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium text-foreground">{ci.quantity}</span>
                            <button
                              onClick={() => updateQuantity(ci.lineKey, ci.quantity + 1)}
                              className="w-7 h-7 rounded-md bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(ci.lineKey)}
                              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {ci.selectedOptions && Object.entries(ci.selectedOptions).filter(([,v]) => v).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1.5 pl-1">
                            <p className="text-xs text-muted-foreground">{k}: <span className="text-foreground">{v}</span></p>
                          </div>
                        ))}
                        {ci.specialInstructions && (
                          <div className="flex items-start gap-1.5 pl-1">
                            <MessageSquare className="w-3 h-3 text-gold mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground italic">{ci.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-4 mt-4 space-y-3 pb-4">
                  {customerInfo.name && (
                    <div className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
                      Ordering as <span className="font-semibold text-foreground">{customerInfo.name}</span>
                      {customerInfo.phone && <> &middot; {customerInfo.phone}</>}
                    </div>
                  )}
                  <TaxBreakdown subtotal={total} taxRate={taxRate} taxAmount={taxAmount} grandTotal={grandTotal} />
                  <Button
                    onClick={() => !checkoutBlocked && setStep("checkout")}
                    disabled={checkoutBlocked}
                    className="w-full gradient-gold text-primary-foreground font-semibold h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isUnpaid ? "Ordering is disabled — subscription inactive" : isOrderCapReached ? "Monthly order cap reached — upgrade to Pro" : undefined}
                  >
                    {checkoutBlocked ? (isUnpaid ? "Ordering Disabled" : "Order Cap Reached") : isSalon ? "Book Appointment" : "Checkout"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
