import { useMenuItems, CATEGORIES, ADMIN_ONLY_CATEGORIES, type MealPeriod } from "@/hooks/useMenuItems";
import { useMealPeriodConfig } from "@/hooks/useMealPeriodConfig";
import { useCart } from "@/contexts/CartContext";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { useAdmin } from "@/contexts/AdminContext";
import { ShoppingBag, Images, Zap } from "lucide-react";

const CATEGORY_TO_PERIOD: Record<string, MealPeriod> = {
  Breakfast: "breakfast",
  Lunch: "lunch",
  Dinner: "dinner",
};

export default function FloatingNavSelector({ restaurantId }: { restaurantId?: string | null }) {
  const { data: items } = useMenuItems(restaurantId);
  const { items: cartItems, setIsOpen } = useCart();
  const { data: settings } = useRestaurantSettings(restaurantId);
  const { isAdmin } = useAdmin();
  const { currentPeriod, isPeriodActive } = useMealPeriodConfig(restaurantId);

  const categoriesWithItems = CATEGORIES.filter((cat) => {
    const hasItems = (items || []).some((i) => i.category === cat);
    if (hasItems) return true;
    if (ADMIN_ONLY_CATEGORIES.includes(cat)) return isAdmin;
    return false;
  });

  const servicePeriodOrder: MealPeriod[] = ["breakfast", "lunch", "dinner"];
  const currentIdx = servicePeriodOrder.indexOf(currentPeriod);

  const sortedCategories = isAdmin
    ? categoriesWithItems
    : [...categoriesWithItems].sort((a, b) => {
        const aPeriod = CATEGORY_TO_PERIOD[a] ?? null;
        const bPeriod = CATEGORY_TO_PERIOD[b] ?? null;
        const aIsService = aPeriod !== null;
        const bIsService = bPeriod !== null;

        if (aIsService && !bIsService) return isPeriodActive(aPeriod!) ? -1 : 1;
        if (!aIsService && bIsService) return isPeriodActive(bPeriod!) ? 1 : -1;
        if (!aIsService && !bIsService) return 0;

        const aActive = isPeriodActive(aPeriod!);
        const bActive = isPeriodActive(bPeriod!);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        const aIdx = servicePeriodOrder.indexOf(aPeriod!);
        const bIdx = servicePeriodOrder.indexOf(bPeriod!);
        const aUpcoming = aIdx > currentIdx;
        const bUpcoming = bIdx > currentIdx;
        if (aUpcoming && !bUpcoming) return -1;
        if (!aUpcoming && bUpcoming) return 1;
        return aIdx - bIdx;
      });

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  if (sortedCategories.length === 0) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border rounded-full px-3 py-2 shadow-2xl">
      {sortedCategories.map((cat) => {
        const catPeriod = CATEGORY_TO_PERIOD[cat] ?? null;
        const isActive = catPeriod ? isPeriodActive(catPeriod) : false;

        return (
          <button
            key={cat}
            onClick={() => scrollTo(`category-${cat}`)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
              isActive
                ? "text-gold bg-gold/10 border border-gold/20 font-semibold"
                : "text-muted-foreground hover:text-gold hover:bg-secondary"
            }`}
          >
            {isActive && <Zap className="w-2.5 h-2.5" />}
            {cat}
          </button>
        );
      })}

      <button
        onClick={() => scrollTo("gallery-section")}
        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-gold hover:bg-secondary rounded-full transition-all duration-200 flex items-center gap-1"
      >
        <Images className="w-3 h-3" />
        Gallery
      </button>

      {cartCount > 0 && (
        <>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-foreground gradient-gold rounded-full transition-all duration-200"
          >
            <ShoppingBag className="w-3 h-3" />
            Cart · {cartCount}
          </button>
        </>
      )}
    </div>
  );
}
