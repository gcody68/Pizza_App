import { useEffect } from "react";
import { AdminProvider } from "@/contexts/AdminContext";
import { CartProvider } from "@/contexts/CartContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
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

  useEffect(() => {
    if (settings) {
      applyBgStyle(getBgStyleById(settings.bg_style || "deep-charcoal"));
      applyTheme(getThemeById(settings.theme || "midnight-gold"));
    }
  }, [settings?.theme, settings?.bg_style]);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar restaurantId={restaurantId} />
      <HeroSection restaurantId={restaurantId} />
      <MenuGrid restaurantId={restaurantId} />
      <GallerySection restaurantId={restaurantId} />
      <CartFAB />
      <CartSidebar restaurantId={restaurantId} />
      <FloatingNavSelector restaurantId={restaurantId} />
      <footer className="border-t border-border py-8 text-center">
        <p className="text-muted-foreground text-xs">
          &copy; {new Date().getFullYear()} · Powered by love for great food
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
