import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Loader as Loader2, ImagePlus, Globe, Copy, CheckCheck, CircleAlert as AlertCircle, ExternalLink, QrCode, Download, TriangleAlert, Circle as XCircle } from "lucide-react";


const SUBDOMAIN_HOST_QR = "loomishq.com";

function generateQRDataUrl(text: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=1a1a1a&color=c9a84c&format=png`;
}
import { useAdmin } from "@/contexts/AdminContext";
import { useRestaurantSettings, useUpdateSettings } from "@/hooks/useRestaurantSettings";
import { uploadImage } from "@/hooks/useImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const SUBDOMAIN_HOST = "loomishq.com";

function slugify(val: string) {
  return val.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors flex-shrink-0"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ProfileTab({ restaurantId }: { restaurantId?: string | null }) {
  const { session } = useAdmin();
  const { data: settings } = useRestaurantSettings(restaurantId);
  const update = useUpdateSettings();
  const qc = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);

  // User identity
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Restaurant identity
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [salesTaxRate, setSalesTaxRate] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Brand identity
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // URL settings
  const [subdomain, setSubdomain] = useState("");
  const [subdomainError, setSubdomainError] = useState("");

  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user && !initialized) {
      setEmail(session.user.email ?? "");
      setFullName(session.user.user_metadata?.full_name ?? "");
    }
  }, [session, initialized]);

  useEffect(() => {
    if (settings && !initialized) {
      setBusinessName(settings.business_name ?? "");
      setPhone(settings.business_phone ?? "");
      setAddress(settings.business_address ?? "");
      setLogoUrl(settings.logo_url ?? "");
      setSubdomain(settings.subdomain ?? "");
      setSalesTaxRate(settings.sales_tax_rate != null ? String(settings.sales_tax_rate) : "");
      setBillingEmail(settings.billing_email ?? "");
      setInitialized(true);
    }
  }, [settings, initialized]);


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, "headers");
      setLogoUrl(url);
      toast.success("Logo uploaded — click Save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed. Please try again.");
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const handleSubdomainChange = (val: string) => {
    setSubdomain(slugify(val));
    setSubdomainError("");
  };

  const handleSave = async () => {
    if (!settings) { toast.error("Settings not loaded yet. Please wait and try again."); return; }

    if (subdomain && subdomain.length < 3) {
      setSubdomainError("Subdomain must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      // Update Supabase auth user metadata
      if (fullName !== (session?.user?.user_metadata?.full_name ?? "")) {
        const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } });
        if (authErr) throw new Error(`Could not update name: ${authErr.message}`);
      }

      // Update restaurant settings
      const taxVal = salesTaxRate.trim() === "" ? null : parseFloat(salesTaxRate);
      if (taxVal !== null && (isNaN(taxVal) || taxVal < 0 || taxVal > 100)) {
        toast.error("Sales tax must be a number between 0 and 100.");
        setSaving(false);
        return;
      }

      await update.mutateAsync({
        id: settings.id,
        business_name: businessName,
        business_phone: phone || null,
        business_address: address || null,
        logo_url: logoUrl || null,
        subdomain: subdomain.trim() || null,
        sales_tax_rate: taxVal,
        billing_email: billingEmail.trim() || null,
      });

      // Subdomain update is handled inside update.mutateAsync above,
      // but conflicts need special handling
      qc.invalidateQueries({ queryKey: ["restaurant-settings"] });
      toast.success("Profile saved successfully!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      if (msg.toLowerCase().includes("subdomain")) {
        setSubdomainError("This subdomain is already taken — please choose another.");
        toast.error("Subdomain is already taken.");
      } else {
        toast.error(`Save failed: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = subdomain ? `https://${subdomain}.${SUBDOMAIN_HOST}` : null;

  return (
    <div className="space-y-8">
      {/* User Identity */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Your Account</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email Address</Label>
            <Input
              value={email}
              disabled
              className="bg-secondary border-border opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Billing Email <span className="text-muted-foreground/50 font-normal">(optional)</span>
          </Label>
          <Input
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder={email}
            type="email"
            className="bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground">
            Only needed if you subscribed with a different email address. Used to locate your Stripe subscription.
          </p>
        </div>
      </section>

      {/* Restaurant Identity */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Restaurant Identity</h3>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Restaurant Name</Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="The Golden Fork"
            className="bg-secondary border-border"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Phone Number</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Physical Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
              className="bg-secondary border-border"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sales Tax Rate (%)</Label>
          <p className="text-xs text-muted-foreground">Applied automatically in the cart. Leave blank for no tax.</p>
          <div className="flex items-center gap-0">
            <Input
              value={salesTaxRate}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                const cleaned = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : val;
                setSalesTaxRate(cleaned.slice(0, 6));
              }}
              placeholder="e.g. 8.25"
              className="bg-secondary border-border rounded-r-none max-w-[140px]"
              inputMode="decimal"
            />
            <span className="bg-muted/60 px-3 py-2 text-xs text-muted-foreground border border-l-0 border-border rounded-r-md font-mono select-none h-10 flex items-center">%</span>
          </div>
        </div>
      </section>

      {/* Brand Identity */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Brand Identity</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Business Logo</Label>
          <p className="text-xs text-muted-foreground">Shown in the navbar and order confirmation pages.</p>
          <div className="flex items-center gap-4 mt-1">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-lg bg-secondary border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors flex-shrink-0"
            >
              {uploadingLogo ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">Logo</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="text-xs text-gold hover:text-gold/80 underline underline-offset-2 transition-colors text-left"
              >
                Upload Logo
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left"
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <p className="text-xs text-muted-foreground/60 mt-1.5">Recommended: 600 × 200 px. Use a transparent PNG or SVG for a professional look.</p>
        </div>

      </section>

      {/* URL Settings */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Public URL</h3>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Subdomain <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Your restaurant's free hosted address. Only lowercase letters, numbers, and hyphens.
          </p>
          <div className={`flex items-center rounded-md border overflow-hidden transition-colors ${subdomainError ? "border-destructive" : "border-border focus-within:border-gold/60"}`}>
            <span className="bg-muted/60 px-3 py-2 text-xs text-muted-foreground border-r border-border whitespace-nowrap font-mono select-none">
              https://
            </span>
            <Input
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              placeholder="your-restaurant"
              className="rounded-none border-0 bg-secondary focus-visible:ring-0 font-mono text-sm flex-1 min-w-0 placeholder:text-muted-foreground/40"
            />
            <span className="bg-muted/60 px-3 py-2 text-xs text-muted-foreground border-l border-border whitespace-nowrap font-mono select-none">
              .{SUBDOMAIN_HOST}
            </span>
          </div>
          {subdomainError && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {subdomainError}
            </p>
          )}
          {previewUrl && !subdomainError && (
            <div className="flex items-center gap-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> {previewUrl}
              </a>
              <CopyButton value={previewUrl} />
            </div>
          )}
        </div>
      </section>

      {/* QR Code */}
      {(() => {
        const pub = subdomain ? `https://${subdomain}.${SUBDOMAIN_HOST_QR}` : (settings?.subdomain ? `https://${settings.subdomain}.${SUBDOMAIN_HOST_QR}` : null);
        if (!pub) return null;
        const qrSrc = generateQRDataUrl(pub, 200);
        const handleDownload = () => {
          const a = document.createElement("a");
          a.href = generateQRDataUrl(pub, 400);
          a.download = "menu-qr-code.png";
          a.click();
        };
        return (
          <section className="space-y-4">
            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" /> Menu QR Code
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">Share this code so guests can scan and open your menu directly.</p>
            <div className="flex items-center gap-6">
              <div className="rounded-lg overflow-hidden border border-border bg-[#1a1a1a] p-2 flex-shrink-0">
                <img src={qrSrc} alt="Menu QR Code" className="w-32 h-32 rounded" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono break-all">{pub}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  className="border-gold/30 text-gold hover:bg-gold/10 gap-1.5 text-xs"
                >
                  <Download className="w-3 h-3" /> Download QR
                </Button>
              </div>
            </div>
          </section>
        );
      })()}

      <Button
        onClick={handleSave}
        disabled={saving || update.isPending}
        className="w-full gradient-gold text-primary-foreground font-semibold"
      >
        {saving || update.isPending
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><Save className="w-4 h-4 mr-2" /> Save Profile</>
        }
      </Button>

      {/* ── Danger Zone ── */}
      <section className="space-y-4 pt-4">
        <div className="border-b border-destructive/30 pb-2">
          <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider flex items-center gap-1.5">
            <TriangleAlert className="w-3.5 h-3.5" /> Danger Zone
          </h3>
        </div>

        <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Cancel Subscription</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                You will retain full access until the end of your current billing period, then your account will be downgraded.
              </p>
            </div>
            <a
              href="https://cancel.loomis-hq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 flex-shrink-0 text-sm border border-destructive/50 text-destructive hover:bg-destructive/10 rounded-md px-3 py-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
