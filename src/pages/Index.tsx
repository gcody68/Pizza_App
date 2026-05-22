import { useEffect } from "react";
import { AdminProvider } from "@/contexts/AdminContext";
import { CartProvider } from "@/contexts/CartContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useRestaurantSettings, isSalonBusiness } from "@/hooks/useRestaurantSettings";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { applyTheme, getThemeById } from "@/lib/themes";
import { applyBgStyle, getBgStyleById } from "@/components/BackgroundStyleSelector";
import AppNavbar from "@/components/AppNavbar";
import HeroSection from "@/components/HeroSection";
import MenuGrid from "@/components/MenuGrid";
import CartSidebar from "@/components/CartSidebar";
import CartFAB from "@/components/CartFAB";
import GallerySection from "@/components/GallerySection";
import FloatingNavSelector from "@/components/FloatingNavSelector";

function AppContent() {
  const { restaurantId } = useRestaurant();
  const { data: settings } = useRestaurantSettings(restaurantId);
  const isSalon = isSalonBusiness(settings);

  useEffect(() => {
    if (settings && !isSalon) {
      applyBgStyle(getBgStyleById(settings.bg_style || "deep-charcoal"));
      applyTheme(getThemeById(settings.theme || "midnight-gold"));
    }
    if (isSalon) {
      // Reset to plain light background for the warm cream salon look
      document.documentElement.style.setProperty("--background", "38 25% 97%");
      document.documentElement.style.setProperty("--foreground", "210 12% 16%");
      document.documentElement.style.setProperty("--card", "0 0% 100%");
      document.documentElement.style.setProperty("--card-foreground", "210 12% 16%");
      document.documentElement.style.setProperty("--border", "38 18% 90%");
      document.documentElement.style.setProperty("--muted", "38 20% 94%");
      document.documentElement.style.setProperty("--muted-foreground", "210 8% 50%");
    }
  }, [settings?.theme, settings?.bg_style, isSalon]);

  return (
    <div className="min-h-screen" style={isSalon ? { background: "hsl(38,25%,97%)" } : undefined}>
      <AppNavbar restaurantId={restaurantId} isSalon={isSalon} />
      <HeroSection restaurantId={restaurantId} />
      <MenuGrid restaurantId={restaurantId} />
      <GallerySection restaurantId={restaurantId} />
      <CartFAB />
      <CartSidebar restaurantId={restaurantId} />
      <FloatingNavSelector restaurantId={restaurantId} />
      <footer className="py-8 text-center" style={isSalon ? { borderTop: "1px solid hsl(38,18%,90%)", background: "hsl(38,25%,97%)" } : { borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: isSalon ? "hsl(210,8%,60%)" : undefined }}>
          {isSalon ? `\u00A9 ${new Date().getFullYear()} ${settings?.business_name || "Loomis Salon"}` : `\u00A9 ${new Date().getFullYear()} Loomis Salon \u00B7 Powered by Loomis`}
        </p>
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <AdminProvider>
      <CartProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </CartProvider>
    </AdminProvider>
  );
}
