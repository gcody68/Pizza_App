import { useState, useRef } from "react";
import { useRestaurantSettings, useUpdateSettings, DEFAULT_SERVICE_HOURS, DEFAULT_BUSINESS_HOURS, type ServiceHours, type BusinessHours } from "@/hooks/useRestaurantSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { uploadImage } from "@/hooks/useImageUpload";
import { toast } from "sonner";
import { Save, ImagePlus, Loader as Loader2, X, Trash2, CreditCard, Settings, Monitor, FileSpreadsheet, KeyRound, Clock, ExternalLink } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import ThemeSelector from "@/components/ThemeSelector";
import BackgroundStyleSelector, { type BgStyleId, applyBgStyle, getBgStyleById } from "@/components/BackgroundStyleSelector";
import { type ThemeId, applyTheme, getThemeById } from "@/lib/themes";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { STARTER_ITEMS } from "@/components/StarterContent"; // fallback only
import ExcelImporter from "@/components/ExcelImporter";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ServiceHoursTab from "@/components/ServiceHoursTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = { restaurantId?: string | null };

export default function AdminPanel({ restaurantId }: Props) {
  const { data: settings } = useRestaurantSettings(restaurantId);
  const update = useUpdateSettings();
  const { logout } = useAdmin();
  const demo = useDemoMode();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [headerUrl, setHeaderUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState<ThemeId>("midnight-gold");
  const [bgStyle, setBgStyle] = useState<BgStyleId>("deep-charcoal");
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [kitchenViewEnabled, setKitchenViewEnabled] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [serviceHours, setServiceHours] = useState<ServiceHours>(DEFAULT_SERVICE_HOURS);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [unavailableDisplay, setUnavailableDisplay] = useState<"hide" | "gray">("hide");

  if (settings && !initialized) {
    setName(settings.business_name);
    setAddress(settings.business_address || "");
    setPhone(settings.business_phone || "");
    setHeaderUrl(settings.header_image_url || "");
    setLogoUrl(settings.logo_url || "");
    setTheme((settings.theme as ThemeId) || "midnight-gold");
    setBgStyle((settings.bg_style as BgStyleId) || "deep-charcoal");
    setPaymentEnabled(settings.payment_enabled ?? false);
    setStripePublicKey(settings.stripe_public_key || "");
    setStripeSecretKey(settings.stripe_secret_key || "");
    setKitchenViewEnabled(settings.kitchen_view_enabled ?? true);
    setShowGallery(settings.show_gallery ?? false);
    setServiceHours(settings.service_hours ?? DEFAULT_SERVICE_HOURS);
    setBusinessHours(settings.business_hours ?? DEFAULT_BUSINESS_HOURS);
    setUnavailableDisplay(settings.unavailable_display === "gray" ? "gray" : "hide");
    setInitialized(true);
  }

  const handleThemeChange = (id: ThemeId) => {
    setTheme(id);
    applyTheme(getThemeById(id));
    applyBgStyle(getBgStyleById(bgStyle));
  };

  const handleBgStyleChange = (id: BgStyleId) => {
    setBgStyle(id);
    applyBgStyle(getBgStyleById(id));
    applyTheme(getThemeById(theme));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "headers");
      setHeaderUrl(url);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, "headers");
      setLogoUrl(url);
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await update.mutateAsync({
        id: settings.id,
        business_name: name,
        business_address: address,
        business_phone: phone,
        header_image_url: headerUrl || null,
        logo_url: logoUrl || null,
        theme,
        bg_style: bgStyle,
        payment_enabled: paymentEnabled,
        stripe_public_key: stripePublicKey.trim() || null,
        stripe_secret_key: stripeSecretKey.trim() || null,
        kitchen_view_enabled: kitchenViewEnabled,
        show_gallery: showGallery,
        service_hours: serviceHours,
        business_hours: businessHours,
        unavailable_display: unavailableDisplay,
      });
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleClearDemo = async () => {
    if (demo) {
      demo.clearMenuItems();
      toast.success("All data cleared!");
      return;
    }
    if (!settings?.id) { toast.error("Restaurant not loaded yet — try again."); return; }
    setClearing(true);
    try {
      const { error: menuErr } = await supabase.from("menu_items").delete().eq("restaurant_id", settings.id);
      if (menuErr) throw new Error(menuErr.message);
      const { error: galleryErr } = await supabase.from("gallery_items").delete().eq("restaurant_id", settings.id);
      if (galleryErr) throw new Error(galleryErr.message);
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      qc.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("All data cleared!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  const handleSeedDemo = async () => {
    if (demo) {
      demo.loadSampleMenu();
      toast.success("Demo items loaded!");
      return;
    }
    if (!settings?.id) return;
    try {
      // Fetch from DB so all users get the latest canonical demo menu
      const { data: demoItems, error: fetchErr } = await supabase
        .from("demo_menu_items" as never)
        .select("name, description, price, category, meal_period, image_url, sort_order")
        .order("sort_order");
      if (fetchErr) throw fetchErr;

      const items = ((demoItems ?? STARTER_ITEMS) as typeof STARTER_ITEMS).map((item) => ({
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        image_url: item.image_url ?? null,
        category: item.category,
        meal_period: item.meal_period,
        sort_order: (item as { sort_order?: number }).sort_order ?? 0,
        is_available: true,
        daily_stock: null,
        is_placeholder: false,
        restaurant_id: settings.id,
      }));

      // Replace existing items instead of appending
      const { error: delErr } = await supabase.from("menu_items").delete().eq("restaurant_id", settings.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("menu_items").insert(items);
      if (insErr) throw insErr;
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      qc.refetchQueries({ queryKey: ["menu-items"] });
      toast.success("Demo items loaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo data");
    }
  };

  return (
    <div className="container py-6">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-gold">Admin Dashboard</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const subdomain = settings?.subdomain;
                const id = settings?.id ?? restaurantId;
                const isProduction = window.location.hostname.endsWith("loomishq.com");
                const shopUrl = subdomain && isProduction
                  ? `https://${subdomain}.loomishq.com`
                  : id
                    ? `${window.location.origin}/?test_res_id=${id}`
                    : window.location.origin;
                window.open(shopUrl, "_blank", "noopener");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4 mr-1" /> View My Public Site
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChangePassword(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <KeyRound className="w-4 h-4 mr-1" /> Password
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="branding">
          <TabsList className="w-full mb-6 bg-secondary grid grid-cols-5">
            <TabsTrigger value="branding" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Branding
            </TabsTrigger>
            <TabsTrigger value="hours" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Hours
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Kitchen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <div>
              <Label className="text-muted-foreground text-xs">Business Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border" />
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Business Logo</Label>
              <p className="text-xs text-muted-foreground mb-1">Displayed in the navbar and order confirmation. If none, business name is shown.</p>
              <div className="flex items-center gap-3 mt-1">
                <div
                  onClick={() => logoFileRef.current?.click()}
                  className="w-24 h-24 rounded-lg bg-secondary border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors flex-shrink-0"
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
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
                    onClick={() => logoFileRef.current?.click()}
                    className="text-xs text-gold hover:text-gold/80 underline underline-offset-2 transition-colors text-left"
                  >
                    Upload Business Logo
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
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            <div>
              <Label className="text-muted-foreground text-xs">Header Image</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-1 h-32 rounded-lg bg-secondary border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : headerUrl ? (
                  <img src={headerUrl} alt="Header" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">Upload</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </div>

            <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium text-foreground">Show Gallery Section</p>
                <p className="text-xs text-muted-foreground">Display photo gallery on the public menu</p>
              </div>
              <Switch checked={showGallery} onCheckedChange={setShowGallery} />
            </div>

            <div className="border-b border-border" />
            <ThemeSelector value={theme} onChange={handleThemeChange} />
            <div className="border-b border-border" />
            <BackgroundStyleSelector value={bgStyle} onChange={handleBgStyleChange} />

            <div className="border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Import & Demo Data</h3>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImporter(true)}
                className="flex-1 gap-2 border-border hover:border-primary/40"
              >
                <FileSpreadsheet className="w-4 h-4" /> Import Menu
              </Button>
              <Button variant="outline" size="sm" onClick={handleSeedDemo} className="flex-1">
                Load Demo Items
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex-1" disabled={clearing}>
                    <Trash2 className="w-4 h-4 mr-1" /> Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Clear All Menu Items?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all menu items. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearDemo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, Clear & Start Fresh
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Tip: In admin mode, click any menu item to edit it.
            </p>
          </TabsContent>

          <TabsContent value="hours">
            <ServiceHoursTab
              serviceHours={serviceHours}
              onChange={setServiceHours}
              businessHours={businessHours}
              onBusinessHoursChange={setBusinessHours}
              unavailableDisplay={unavailableDisplay}
              onDisplayChange={setUnavailableDisplay}
            />
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Online Payments</p>
                <p className="text-xs text-muted-foreground">Collect card payments at checkout</p>
              </div>
              <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
            </div>

            {paymentEnabled ? (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-secondary/30">
                <p className="text-xs text-muted-foreground">
                  Enter your Stripe or Paystack API keys. Public key is used client-side; secret key is stored securely.
                </p>
                <div>
                  <Label className="text-muted-foreground text-xs">Public Key (pk_live_... or pk_test_...)</Label>
                  <Input
                    value={stripePublicKey}
                    onChange={(e) => setStripePublicKey(e.target.value)}
                    placeholder="pk_live_..."
                    className="bg-secondary border-border font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Secret Key (sk_live_... or sk_test_...)</Label>
                  <Input
                    type="password"
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="bg-secondary border-border font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-amber-500/80">Keep your secret key private. It will be masked after saving.</p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Toggle on to configure your payment processor.</p>
                <p className="text-xs mt-1">Customers will see "Pay in Person" when payments are off.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="kitchen" className="space-y-6">
            <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
              <div>
                <p className="text-sm font-medium text-foreground">Kitchen Display</p>
                <p className="text-xs text-muted-foreground">Enable the /kitchen page for your kitchen staff</p>
              </div>
              <Switch checked={kitchenViewEnabled} onCheckedChange={setKitchenViewEnabled} />
            </div>

            {kitchenViewEnabled ? (
              <div className="border border-border rounded-lg p-4 bg-secondary/30 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Share this link with your kitchen staff. Orders placed by customers appear here in real-time.
                </p>
                <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
                  <span className="text-xs font-mono text-gold flex-1 truncate">
                    {window.location.origin}/kitchen{demo ? "?demo=1" : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/kitchen${demo ? "?demo=1" : ""}`);
                      toast.success("Link copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Kitchen display is currently disabled.</p>
              </div>
            )}
          </TabsContent>

        </Tabs>

        <div className="mt-6 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="w-full gradient-gold text-primary-foreground font-semibold"
          >
            {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save All Changes</>}
          </Button>
        </div>
      </div>

      <ExcelImporter open={showImporter} onClose={() => setShowImporter(false)} />
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  );
}
