import { useState, useEffect, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AdminProvider, useAdmin } from "@/contexts/AdminContext";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { CartProvider } from "@/contexts/CartContext";
import { useRestaurantSettings, useUpdateSettings, DEFAULT_SERVICE_HOURS, DEFAULT_BUSINESS_HOURS, type ServiceHours, type BusinessHours } from "@/hooks/useRestaurantSettings";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { uploadImage } from "@/hooks/useImageUpload";
import ThemeSelector from "@/components/ThemeSelector";
import BackgroundStyleSelector, { type BgStyleId, applyBgStyle as applyBgStyleFn, getBgStyleById as getBgStyleByIdFn } from "@/components/BackgroundStyleSelector";
import { type ThemeId, applyTheme as applyThemeFn, getThemeById as getThemeByIdFn } from "@/lib/themes";
import ServiceHoursTab from "@/components/ServiceHoursTab";
import SiteSettingsTab from "@/components/SiteSettingsTab";
import ProfileTab from "@/components/ProfileTab";
import ExcelImporter from "@/components/ExcelImporter";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UtensilsCrossed, Settings, Clock, CreditCard, Monitor, Globe, User, Save, ImagePlus, Loader as Loader2, X, Trash2, FileSpreadsheet, KeyRound, ExternalLink, Download, LogOut, ChefHat, Plus, Pencil, Menu as MenuIcon, Bitcoin, Shield, UserCheck, TrendingDown, RefreshCw, Ban } from "lucide-react";
import { useMenuItems, type MenuItem } from "@/hooks/useMenuItems";
import MenuItemModal from "@/components/MenuItemModal";
import { STARTER_ITEMS } from "@/components/StarterContent";
import { useImpersonation, ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import SubscriptionBanner, { ProBadge } from "@/components/SubscriptionBanner";
import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// QR Code generator (pure canvas, no external dep)
// ---------------------------------------------------------------------------
function generateQRDataUrl(text: string, size = 200): string {
  // Simple URL encoding — we use a deterministic QR via an SVG path trick
  // for zero-dependency. Render via a hidden canvas using the browser's
  // native QR capability if available, else fall back to the API URL approach
  // (we embed it as an <img> in the sidebar so an img src trick works fine).
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=1a1a1a&color=c9a84c&format=png`;
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------
async function exportMenuData(restaurantId: string): Promise<void> {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("category");
  if (error) throw new Error(`Menu export failed: ${error.message}`);

  const rows = (data ?? []).map((item) => ({
    Name: item.name,
    Description: item.description ?? "",
    Price: item.price,
    Category: item.category ?? "",
    "Meal Period": item.meal_period ?? "",
    Available: item.is_available ? "Yes" : "No",
    "Daily Stock": item.daily_stock ?? "",
    "Image URL": item.image_url ?? "",
    "Is Special": item.is_special ? "Yes" : "No",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Menu Items");
  XLSX.writeFile(wb, `menu-backup-${new Date().toISOString().split("T")[0]}.xlsx`);
}

async function exportDailyReceipts(restaurantId: string, date: string): Promise<void> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data: ordersRes, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Orders export failed: ${error.message}`);

  const orderRows = (ordersRes ?? []).flatMap((order: Record<string, unknown>) => {
    const items = (order.order_items as Record<string, unknown>[] | undefined) ?? [];
    if (items.length === 0) {
      return [{
        "Order ID": order.id,
        Date: new Date(order.created_at as string).toLocaleString(),
        Customer: order.customer_name ?? "",
        Phone: order.customer_phone ?? "",
        Email: order.customer_email ?? "",
        "Item Name": "",
        Quantity: "",
        "Item Price": "",
        "Order Total": order.total,
        Status: order.status,
      }];
    }
    return items.map((item, idx) => ({
      "Order ID": idx === 0 ? order.id : "",
      Date: idx === 0 ? new Date(order.created_at as string).toLocaleString() : "",
      Customer: idx === 0 ? (order.customer_name ?? "") : "",
      Phone: idx === 0 ? (order.customer_phone ?? "") : "",
      Email: idx === 0 ? (order.customer_email ?? "") : "",
      "Item Name": item.name ?? "",
      Quantity: item.quantity ?? 1,
      "Item Price": item.price ?? "",
      "Order Total": idx === 0 ? order.total : "",
      Status: idx === 0 ? order.status : "",
    }));
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Daily Receipts");
  XLSX.writeFile(wb, `receipts-${date}.xlsx`);
}

// ---------------------------------------------------------------------------
// Inner dashboard (requires auth)
// ---------------------------------------------------------------------------
function DashboardContent() {
  const { isAdmin, isSuperAdmin, authLoading, session, logout } = useAdmin();
  const { restaurantId } = useRestaurant();
  const { tier, isBoutique, isUnpaid, hasNoSubscription } = useSubscription();
  const { data: settings, isLoading: settingsLoading } = useRestaurantSettings();
  const update = useUpdateSettings();
  const qc = useQueryClient();
  const demo = useDemoMode();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("branding");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Branding state
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
  const [exportingMenu, setExportingMenu] = useState(false);
  const [exportingReceipts, setExportingReceipts] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [stripePublicKey, setStripePublicKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeSecretKeySaved, setStripeSecretKeySaved] = useState(false);
  const [stripeSecretKeyEditing, setStripeSecretKeyEditing] = useState(false);
  const [kitchenViewEnabled, setKitchenViewEnabled] = useState(true);
  const [showGallery, setShowGallery] = useState(false);
  const [serviceHours, setServiceHours] = useState<ServiceHours>(DEFAULT_SERVICE_HOURS);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [unavailableDisplay, setUnavailableDisplay] = useState<"hide" | "gray">("hide");

  // Daily receipts date picker
  const today = new Date().toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [receiptsDate, setReceiptsDate] = useState(today);

  const { startImpersonation } = useImpersonation();
  const [userList, setUserList] = useState<{ id: string; email: string; business_name: string | null; created_at: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Churn Analytics state
  type ChurnRow = {
    id: string; restaurant_name: string; owner_email: string;
    cancelled_at: string; ltv_at_churn: number;
    affiliate_name: string | null; affiliate_id: string | null;
  };
  const [churnEvents, setChurnEvents] = useState<ChurnRow[]>([]);
  const [loadingChurn, setLoadingChurn] = useState(false);
  const [churnLoaded, setChurnLoaded] = useState(false);

  const fetchChurnEvents = async () => {
    setLoadingChurn(true);
    try {
      const { data } = await supabase
        .from("churn_events")
        .select("id, restaurant_name, owner_email, cancelled_at, ltv_at_churn, affiliate_name, affiliate_id")
        .order("cancelled_at", { ascending: false });
      setChurnEvents((data ?? []) as ChurnRow[]);
      setChurnLoaded(true);
    } finally {
      setLoadingChurn(false);
    }
  };

  const [cancellingUserId, setCancellingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [autoDeleteOnChurn, setAutoDeleteOnChurn] = useState<boolean>(true);
  const [autoDeleteLoading, setAutoDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "auto_delete_on_churn")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAutoDeleteOnChurn(data.value === true);
      });
  }, [isSuperAdmin]);

  const toggleAutoDelete = async (enabled: boolean) => {
    setAutoDeleteLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: enabled, updated_at: new Date().toISOString() })
        .eq("key", "auto_delete_on_churn");
      if (error) throw error;
      setAutoDeleteOnChurn(enabled);
      toast.success(`Auto-delete on churn ${enabled ? "enabled" : "disabled"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setAutoDeleteLoading(false);
    }
  };

  const deleteUserAccount = async (userId: string, userEmail: string) => {
    setDeletingUserId(userId);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ target_owner_id: userId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete");
      toast.success(`Account fully deleted for ${userEmail}`);
      setUserList((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeletingUserId(null);
    }
  };

  const cancelUserAccount = async (userId: string, userEmail: string) => {
    setCancellingUserId(userId);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ target_owner_id: userId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to cancel");
      toast.success(`Account cancelled for ${userEmail}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel account");
    } finally {
      setCancellingUserId(null);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await supabase
        .from("restaurant_settings")
        .select("owner_id, business_name, created_at")
        .not("owner_id", "is", null)
        .order("created_at", { ascending: false });

      if (data) {
        const ownerIds = [...new Set(data.map((r) => r.owner_id as string))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", ownerIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.email]));
        const rows = data
          .filter((r) => r.owner_id !== session?.user?.id)
          .map((r) => ({
            id: r.owner_id as string,
            email: profileMap.get(r.owner_id as string) ?? "unknown",
            business_name: r.business_name,
            created_at: r.created_at,
          }));
        setUserList(rows);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const menuRestaurantId = settings?.id ?? restaurantId;
  const { data: menuItems } = useMenuItems(menuRestaurantId);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [addingItemCategory, setAddingItemCategory] = useState<string | null>(null);

  useEffect(() => {
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
      if (settings.stripe_secret_key) {
        setStripeSecretKeySaved(true);
        setStripeSecretKeyEditing(false);
      }
      setKitchenViewEnabled(settings.kitchen_view_enabled ?? true);
      setShowGallery(settings.show_gallery ?? false);
      setServiceHours(settings.service_hours ?? DEFAULT_SERVICE_HOURS);
      setBusinessHours(settings.business_hours ?? DEFAULT_BUSINESS_HOURS);
      setUnavailableDisplay(settings.unavailable_display === "gray" ? "gray" : "hide");
      setInitialized(true);

      applyThemeFn(getThemeByIdFn((settings.theme as ThemeId) || "midnight-gold"));
      applyBgStyleFn(getBgStyleByIdFn((settings.bg_style as BgStyleId) || "deep-charcoal"));
    }
  }, [settings, initialized]);

  // Sync header/logo URLs whenever settings refetch (e.g. after Excel import)
  useEffect(() => {
    if (!initialized) return;
    if (settings?.header_image_url !== undefined) setHeaderUrl(settings.header_image_url || "");
    if (settings?.logo_url !== undefined) setLogoUrl(settings.logo_url || "");
  }, [settings?.header_image_url, settings?.logo_url]);

  const handleThemeChange = (id: ThemeId) => {
    setTheme(id);
    applyThemeFn(getThemeByIdFn(id));
    applyBgStyleFn(getBgStyleByIdFn(bgStyle));
  };

  const handleBgStyleChange = (id: BgStyleId) => {
    setBgStyle(id);
    applyBgStyleFn(getBgStyleByIdFn(id));
    applyThemeFn(getThemeByIdFn(theme));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, "headers");
      setHeaderUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Header image upload failed");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!settings) { toast.error("Settings not loaded — please wait and try again."); return; }
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
      if (stripeSecretKey.trim()) {
        setStripeSecretKeySaved(true);
        setStripeSecretKeyEditing(false);
      }
      toast.success("Settings saved!");
    } catch (err) {
      toast.error(err instanceof Error ? `Save failed: ${err.message}` : "Save failed — please try again.");
    }
  };

  const handleClearDemo = async () => {
    if (demo) {
      demo.clearMenuItems();
      toast.success("All data cleared!");
      return;
    }
    if (!settings?.id) { toast.error("Restaurant not loaded — try again."); return; }
    setClearing(true);
    try {
      const { error: menuErr } = await supabase.from("menu_items").delete().eq("restaurant_id", settings.id);
      if (menuErr) throw new Error(menuErr.message);
      const { error: galleryErr } = await supabase.from("gallery_items").delete().eq("restaurant_id", settings.id);
      if (galleryErr) throw new Error(galleryErr.message);
      await qc.invalidateQueries({ queryKey: ["menu-items"] });
      await qc.refetchQueries({ queryKey: ["menu-items"] });
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
    if (!settings?.id) { toast.error("Restaurant not loaded — try again."); return; }
    try {
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
      const { error: delErr } = await supabase.from("menu_items").delete().eq("restaurant_id", settings.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("menu_items").insert(items);
      if (insErr) throw insErr;
      await qc.invalidateQueries({ queryKey: ["menu-items"] });
      await qc.refetchQueries({ queryKey: ["menu-items"] });
      toast.success("Demo items loaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo items");
    }
  };

  const handleExportMenu = async () => {
    if (!settings?.id) { toast.error("Restaurant not loaded — try again."); return; }
    setExportingMenu(true);
    try {
      await exportMenuData(settings.id);
      toast.success("Menu backup downloaded!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingMenu(false);
    }
  };

  const handleExportReceipts = async () => {
    if (!settings?.id) { toast.error("Restaurant not loaded — try again."); return; }
    setExportingReceipts(true);
    try {
      await exportDailyReceipts(settings.id, receiptsDate);
      toast.success(`Receipts for ${receiptsDate} downloaded!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingReceipts(false);
    }
  };

  const getPublicUrl = () => {
    const subdomain = settings?.subdomain;
    const customDomain = settings?.custom_domain;
    const id = settings?.id ?? restaurantId;
    if (customDomain) return `https://${customDomain}`;
    if (subdomain) return `https://${subdomain}.loomishq.com`;
    return id ? `${window.location.origin}/?test_res_id=${id}` : window.location.origin;
  };

  const handleViewPublicSite = () => {
    if (demo) { navigate("/menu"); return; }
    window.open(getPublicUrl(), "_blank", "noopener");
  };

  const handleKitchenDisplay = () => {
    if (demo) { navigate("/kitchen"); return; }
    const id = settings?.id ?? restaurantId;
    const customDomain = settings?.custom_domain;
    const subdomain = settings?.subdomain;
    let url: string;
    if (customDomain) url = `https://${customDomain}/kitchen`;
    else if (subdomain) url = `https://${subdomain}.loomishq.com/kitchen`;
    else url = `${window.location.origin}/kitchen`;
    window.open(url, "_blank", "noopener");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // No subscription at all → send to pricing
  if (!isSuperAdmin && tier !== "loading" && hasNoSubscription) {
    window.location.href = "https://loomishq.com/#pricing";
    return null;
  }


  const NAV_TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "branding", label: "Branding", icon: Settings },
    { id: "hours", label: "Hours", icon: Clock },
    { id: "payment", label: "Payment", icon: CreditCard },
    { id: "kitchen", label: "Kitchen", icon: Monitor },
    ...(isSuperAdmin ? [
      { id: "super_admin", label: "Super Admin", icon: Shield },
      { id: "churn_analytics", label: "Churn Analytics", icon: TrendingDown },
    ] : []),
  ];

  const SidebarContent = () => (
    <>
      {/* Logo / brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">Dashboard</p>
            <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[120px]">
              {settings?.business_name ?? "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-shrink-0 px-3 py-4 space-y-0.5">
        {NAV_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-primary/15 text-gold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Quick actions — directly below nav tabs */}
      <div className="flex-1 px-3 pb-4 border-t border-border space-y-0.5 pt-3">
        <button
          onClick={handleViewPublicSite}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          View My Public Site
        </button>
        <button
          onClick={handleKitchenDisplay}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChefHat className="w-4 h-4 flex-shrink-0" />
          Kitchen Display
        </button>
        <button
          onClick={() => setShowChangePassword(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <KeyRound className="w-4 h-4 flex-shrink-0" />
          Change Password
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-card border-r border-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile drawer header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">Dashboard</p>
              <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[140px]">
                {settings?.business_name ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav tabs */}
        <nav className="flex-shrink-0 px-3 py-2 space-y-0.5">
          {NAV_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-primary/15 text-gold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Quick actions — directly below nav tabs */}
        <div className="flex-1 border-t border-border px-3 py-2 space-y-0.5">
          <button
            onClick={handleViewPublicSite}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-4 h-4 flex-shrink-0" />
            View My Public Site
          </button>
          <button
            onClick={handleKitchenDisplay}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChefHat className="w-4 h-4 flex-shrink-0" />
            Kitchen Display
          </button>
          <button
            onClick={() => { setShowChangePassword(true); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            Change Password
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <SubscriptionBanner />
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-card border-b border-border flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-gold hover:bg-secondary transition-colors flex-shrink-0"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md gradient-gold flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-3 h-3 text-primary-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {settings?.business_name ?? "Dashboard"}
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          {activeTab === "profile" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Profile & Settings</h1>
              <ProfileTab restaurantId={restaurantId} />
            </>
          )}

          {activeTab === "branding" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Branding</h1>
              <div className="space-y-6">
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
                      onClick={() => document.getElementById("logo-upload-branding")?.click()}
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
                        onClick={() => document.getElementById("logo-upload-branding")?.click()}
                        className="text-xs text-gold hover:text-gold/80 underline underline-offset-2 transition-colors text-left"
                      >
                        Upload Business Logo
                      </button>
                      {logoUrl && (
                        <button type="button" onClick={() => setLogoUrl("")} className="text-xs text-muted-foreground hover:text-destructive transition-colors text-left">
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>
                  <input id="logo-upload-branding" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <p className="text-xs text-muted-foreground/60 mt-1.5">Recommended: 600 × 200 px. Use a transparent PNG or SVG for a professional look.</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Header Image</Label>
                  <div className="relative group mt-1">
                    <div
                      onClick={() => document.getElementById("header-upload-branding")?.click()}
                      className="h-32 rounded-lg bg-secondary border-2 border-dashed border-border hover:border-primary/40 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
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
                    {headerUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setHeaderUrl(""); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-destructive text-white rounded-full p-1"
                        title="Remove header image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                  <input id="header-upload-branding" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <p className="text-xs text-muted-foreground/60 mt-1.5">Recommended: 1920 × 1080 px (16:9). High-resolution landscape photos work best.</p>
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
                  <Button variant="outline" size="sm" onClick={() => setShowImporter(true)} className="flex-1 gap-2 border-border hover:border-primary/40">
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
                        <AlertDialogTitle className="text-foreground">Clear All Menu Items & Gallery?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all menu items and gallery photos. This action cannot be undone.
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

                {/* Data Export */}
                <div className="border-b border-border pb-2 mt-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Data & Backups</h3>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportMenu}
                    disabled={exportingMenu}
                    className="w-full gap-2 border-border hover:border-gold/40 hover:text-gold"
                  >
                    {exportingMenu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Backup All Data (Menu + Images)
                  </Button>

                  <div className={`border rounded-lg p-3 space-y-3 ${isBoutique ? "border-border bg-secondary/10 opacity-60" : "border-border bg-secondary/20"}`}>
                    <p className="text-xs font-semibold text-foreground flex items-center">
                      Daily Receipts
                      {isBoutique && <ProBadge />}
                    </p>
                    {isBoutique ? (
                      <p className="text-xs text-muted-foreground">Daily receipt exports are available on the Pro plan.</p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">Export orders for a specific day (up to 3 days back).</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={receiptsDate}
                            min={threeDaysAgo}
                            max={today}
                            onChange={(e) => setReceiptsDate(e.target.value)}
                            className="flex-1 bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-gold/60 transition-colors"
                          />
                          <Button
                            size="sm"
                            onClick={handleExportReceipts}
                            disabled={exportingReceipts}
                            className="gradient-gold text-primary-foreground font-semibold shrink-0"
                          >
                            {exportingReceipts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Menu Item Management */}
                <div className="border-b border-border pb-2 mt-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Menu Items</h3>
                </div>

                {(!menuItems || menuItems.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">No menu items yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Use "Load Demo Items" above or add one below.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {menuItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2 group">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                            {item.name}
                            {item.is_special && (
                              <span className="text-[9px] font-bold bg-gold/20 text-gold px-1 py-0.5 rounded uppercase">Special</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.category} · ${Number(item.price).toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-card text-muted-foreground hover:text-gold"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingItemCategory("Lunch")}
                  className="w-full gap-2 border-dashed border-border hover:border-gold/40 hover:text-gold"
                >
                  <Plus className="w-4 h-4" /> Add Menu Item
                </Button>

                <div className="pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={update.isPending} className="w-full gradient-gold text-primary-foreground font-semibold">
                    {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === "hours" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Service Hours</h1>
              <ServiceHoursTab
                serviceHours={serviceHours}
                onChange={setServiceHours}
                businessHours={businessHours}
                onBusinessHoursChange={setBusinessHours}
                unavailableDisplay={unavailableDisplay}
                onDisplayChange={setUnavailableDisplay}
              />
              <div className="pt-4 border-t border-border mt-6">
                <Button onClick={handleSave} disabled={update.isPending} className="w-full gradient-gold text-primary-foreground font-semibold">
                  {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                </Button>
              </div>
            </>
          )}

          {activeTab === "payment" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Payment Settings</h1>
              <div className="space-y-6">
                {/* Card Payments */}
                <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Enable Card Payments</p>
                    <p className="text-xs text-muted-foreground">Collect card payments at checkout</p>
                  </div>
                  <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
                </div>

                {paymentEnabled && (
                  <div className="space-y-4 border border-border rounded-lg p-4 bg-secondary/30">
                    <p className="text-xs text-muted-foreground">
                      Enter your Stripe secret key. Find it in your <span className="text-gold">Stripe Dashboard → Developers → API keys</span>.
                    </p>
                    <div>
                      <Label className="text-muted-foreground text-xs">Secret Key (sk_live_... or sk_test_...)</Label>
                      {stripeSecretKeySaved && !stripeSecretKeyEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={stripeSecretKey ? `${stripeSecretKey.slice(0, 12)}${"•".repeat(24)}` : ""}
                            readOnly
                            autoComplete="off"
                            className="bg-secondary border-border font-mono text-sm text-muted-foreground cursor-default"
                          />
                          <button
                            type="button"
                            onClick={() => setStripeSecretKeyEditing(true)}
                            className="text-xs text-gold hover:text-gold/80 whitespace-nowrap underline underline-offset-2"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <Input
                            value={stripeSecretKeyEditing ? stripeSecretKey : ""}
                            onChange={(e) => setStripeSecretKey(e.target.value)}
                            placeholder="sk_live_..."
                            autoComplete="off"
                            autoFocus={stripeSecretKeyEditing}
                            className={`bg-secondary border-border font-mono text-sm ${
                              stripeSecretKey && !stripeSecretKey.startsWith("sk_") ? "border-destructive" : ""
                            }`}
                          />
                          {stripeSecretKeyEditing && (
                            <button
                              type="button"
                              onClick={() => { setStripeSecretKeyEditing(false); }}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1 underline underline-offset-2"
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                      {!stripeSecretKeySaved && stripeSecretKey && !stripeSecretKey.startsWith("sk_") && (
                        <p className="text-destructive text-xs mt-1">This doesn't look like a valid Stripe secret key. It should start with <span className="font-mono">sk_live_</span> or <span className="font-mono">sk_test_</span>.</p>
                      )}
                      {!stripeSecretKeySaved && stripeSecretKey && stripeSecretKey.startsWith("sk_") && (
                        <p className="text-xs mt-1 text-emerald-500">Key looks valid ({stripeSecretKey.startsWith("sk_live_") ? "live mode" : "test mode"})</p>
                      )}
                      {stripeSecretKeyEditing && stripeSecretKey && stripeSecretKey.startsWith("sk_") && (
                        <p className="text-xs mt-1 text-emerald-500">Key looks valid ({stripeSecretKey.startsWith("sk_live_") ? "live mode" : "test mode"})</p>
                      )}
                    </div>
                    <p className="text-xs text-amber-500/80">Keep your secret key private. It is masked for security.</p>
                  </div>
                )}

                {/* Crypto Payments */}
                <div className={`flex items-center justify-between py-2 border rounded-lg px-4 ${isBoutique ? "border-border opacity-60" : "border-border"}`}>
                  <div className="flex items-center gap-2">
                    <Bitcoin className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center">
                        Accept Crypto Payments
                        {isBoutique && <ProBadge />}
                      </p>
                      <p className="text-xs text-muted-foreground">Show a crypto wallet address at checkout</p>
                    </div>
                  </div>
                  <Switch checked={isBoutique ? false : cryptoEnabled} onCheckedChange={isBoutique ? undefined : setCryptoEnabled} disabled={isBoutique} />
                </div>

                {cryptoEnabled && (
                  <div className="space-y-4 border border-amber-500/20 rounded-lg p-4 bg-amber-500/5">
                    <p className="text-xs text-muted-foreground">
                      Customers will see this wallet address during checkout. Accepts BTC, ETH, USDC, or any wallet address.
                    </p>
                    <div>
                      <Label className="text-muted-foreground text-xs">Crypto Wallet Address</Label>
                      <Input
                        value={cryptoAddress}
                        onChange={(e) => setCryptoAddress(e.target.value)}
                        placeholder="0x... or bc1... or your wallet address"
                        className="bg-secondary border-border font-mono text-sm"
                      />
                    </div>
                    {cryptoAddress && (
                      <div className="flex items-center gap-2 rounded-lg bg-secondary/60 p-2">
                        <img
                          src={generateQRDataUrl(cryptoAddress, 80)}
                          alt="Crypto QR"
                          className="w-16 h-16 rounded"
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground">Customer QR Preview</p>
                          <p className="text-[10px] text-muted-foreground break-all mt-0.5">{cryptoAddress.slice(0, 24)}…</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!paymentEnabled && !cryptoEnabled && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Toggle on a payment method above.</p>
                    <p className="text-xs mt-1">Customers will see "Pay in Person" when all payments are off.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={update.isPending} className="w-full gradient-gold text-primary-foreground font-semibold">
                    {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === "kitchen" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Kitchen Display</h1>
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2 border border-border rounded-lg px-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Kitchen Display System</p>
                    <p className="text-xs text-muted-foreground">Enable the /kitchen page for your kitchen staff</p>
                  </div>
                  <Switch checked={kitchenViewEnabled} onCheckedChange={setKitchenViewEnabled} />
                </div>

                {kitchenViewEnabled && (
                  <div className="border border-border rounded-lg p-4 bg-secondary/30 space-y-3">
                    <p className="text-xs text-muted-foreground">Share this link with your kitchen staff. Orders appear in real-time.</p>
                    <div className="flex items-center gap-2 bg-secondary rounded-md px-3 py-2">
                      <span className="text-xs font-mono text-gold flex-1 truncate">
                        {demo ? "Kitchen Display (Demo)" : `${window.location.origin}/kitchen`}
                      </span>
                      {!demo && (
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/kitchen`); toast.success("Link copied!"); }}>
                          Copy
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={handleKitchenDisplay}>
                        Open
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={update.isPending} className="w-full gradient-gold text-primary-foreground font-semibold">
                    {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === "site" && (
            <>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-6">Site Settings</h1>
              {settings ? (
                <SiteSettingsTab settings={settings} menuItemCount={menuItems?.length ?? 0} />
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading settings...</div>
              )}
            </>
          )}

          {activeTab === "super_admin" && isSuperAdmin && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-foreground">Super Admin</h1>
                  <p className="text-xs text-muted-foreground">Impersonate any restaurant owner's account</p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-6 text-sm text-amber-400/90">
                All actions taken while impersonating a user are logged in the system audit trail.
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card mb-6">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-delete accounts on churn</p>
                  <p className="text-xs text-muted-foreground mt-0.5">When enabled, all account data is automatically wiped when a subscription expires in Stripe.</p>
                </div>
                <Switch
                  checked={autoDeleteOnChurn}
                  onCheckedChange={toggleAutoDelete}
                  disabled={autoDeleteLoading}
                  className="ml-4 shrink-0"
                />
              </div>

              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Restaurant accounts</p>
                <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loadingUsers} className="gap-2">
                  {loadingUsers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  {loadingUsers ? "Loading..." : "Load Users"}
                </Button>
              </div>

              {userList.length > 0 && (
                <div className="relative mb-4">
                  <Input
                    placeholder="Search by email or restaurant name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-secondary border-border pl-9"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  {userSearch && (
                    <button onClick={() => setUserSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {userList.length === 0 && !loadingUsers && (
                <div className="text-center py-10 text-muted-foreground text-sm border border-border rounded-lg">
                  Click "Load Users" to list all restaurant accounts.
                </div>
              )}

              {userList.length > 0 && (() => {
                const q = userSearch.toLowerCase();
                const filtered = userSearch
                  ? userList.filter((u) => u.email.toLowerCase().includes(q) || (u.business_name ?? "").toLowerCase().includes(q))
                  : userList;
                return filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-border rounded-lg">
                    No accounts match "{userSearch}"
                  </div>
                ) : (
                <div className="space-y-2">
                  {filtered.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-amber-500/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{user.business_name ?? "Unnamed Restaurant"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                          onClick={() => startImpersonation(user.id, session?.user?.email ?? "super_admin")}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Log in as User
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              disabled={cancellingUserId === user.id}
                            >
                              {cancellingUserId === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Ban className="w-3.5 h-3.5" />
                              )}
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel this account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will cancel the subscription for <strong>{user.business_name ?? "this restaurant"}</strong> ({user.email}). Their account will remain active until the end of their billing period.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Account</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => cancelUserAccount(user.id, user.email)}
                              >
                                Yes, Cancel Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 border-red-800/40 text-red-500 hover:bg-red-900/20 hover:text-red-400"
                              disabled={deletingUserId === user.id}
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently delete this account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will <strong>permanently delete</strong> all data for <strong>{user.business_name ?? "this restaurant"}</strong> ({user.email}) — including menu items, orders, and the login account. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Account</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-700 hover:bg-red-800 text-white"
                                onClick={() => deleteUserAccount(user.id, user.email)}
                              >
                                Yes, Delete Everything
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
                );
              })()}
            </>
          )}

          {activeTab === "churn_analytics" && isSuperAdmin && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-serif font-bold text-foreground">Churn Analytics</h1>
                  <p className="text-xs text-muted-foreground">Merchants who cancelled their subscription</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">{churnLoaded ? `${churnEvents.length} churn event${churnEvents.length !== 1 ? "s" : ""}` : "Load to see churn data"}</p>
                <Button size="sm" variant="outline" onClick={fetchChurnEvents} disabled={loadingChurn} className="gap-2">
                  {loadingChurn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {loadingChurn ? "Loading..." : churnLoaded ? "Refresh" : "Load Data"}
                </Button>
              </div>

              {/* Summary stats */}
              {churnLoaded && churnEvents.length > 0 && (() => {
                const totalLtv = churnEvents.reduce((s, e) => s + (e.ltv_at_churn ?? 0), 0);
                const withPartner = churnEvents.filter((e) => e.affiliate_id).length;
                const partnerCounts: Record<string, number> = {};
                churnEvents.forEach((e) => { if (e.affiliate_name) partnerCounts[e.affiliate_name] = (partnerCounts[e.affiliate_name] ?? 0) + 1; });
                const topPartner = Object.entries(partnerCounts).sort((a, b) => b[1] - a[1])[0];
                return (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{churnEvents.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Churned</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">${totalLtv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total LTV Lost</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">{withPartner}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Partner Referrals</p>
                      {topPartner && <p className="text-[10px] text-amber-400 mt-0.5 truncate">Top: {topPartner[0]}</p>}
                    </div>
                  </div>
                );
              })()}

              {!churnLoaded && !loadingChurn && (
                <div className="text-center py-10 text-muted-foreground text-sm border border-border rounded-lg">
                  Click "Load Data" to view churn events.
                </div>
              )}

              {churnLoaded && churnEvents.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm border border-border rounded-lg">
                  No churn events recorded yet.
                </div>
              )}

              {churnLoaded && churnEvents.length > 0 && (
                <div className="space-y-2">
                  {churnEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-red-500/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{event.restaurant_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{event.owner_email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-foreground">${(event.ltv_at_churn ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-muted-foreground">LTV</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Cancelled: <span className="text-foreground">{new Date(event.cancelled_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                        </span>
                        {event.affiliate_name ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            Partner: {event.affiliate_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-[10px]">No partner referral</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ExcelImporter open={showImporter} onClose={() => setShowImporter(false)} />
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} />
      {editingItem && (
        <MenuItemModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}
      {addingItemCategory && (
        <MenuItemModal category={addingItemCategory} onClose={() => setAddingItemCategory(null)} />
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <AdminProvider>
      <CartProvider>
        <ImpersonationProvider>
          <SubscriptionProvider>
            <DashboardContent />
          </SubscriptionProvider>
        </ImpersonationProvider>
      </CartProvider>
    </AdminProvider>
  );
}
