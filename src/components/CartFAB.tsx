import { useCart } from "@/contexts/CartContext";
import { ShoppingBag } from "lucide-react";

export default function CartFAB() {
  const { itemCount, setIsOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 z-50 gradient-gold text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:scale-105 transition-transform active:scale-95"
    >
      <ShoppingBag className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
        {itemCount}
      </span>
    </button>
  );
}
