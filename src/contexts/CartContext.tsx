import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import type { MenuItem, ItemVariant } from "@/hooks/useMenuItems";

/** Map of option group label → chosen value, e.g. { "Choose a Side": "Fries" } */
export type SelectedOptions = Record<string, string>;

export type CartItem = {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
  selectedVariant?: ItemVariant;
  selectedOptions?: SelectedOptions;
  appointmentDate?: string;
  appointmentTime?: string;
  /** Unique key per cart line — id + variant label so the same item can appear with different variants */
  lineKey: string;
};

export type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: MenuItem, specialInstructions?: string, variant?: ItemVariant, options?: SelectedOptions, appointmentDate?: string, appointmentTime?: string) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, qty: number) => void;
  updateSpecialInstructions: (lineKey: string, instructions: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  pendingItem: MenuItem | null;
  setPendingItem: (item: MenuItem | null, variant?: ItemVariant) => void;
  pendingVariant: ItemVariant | null;
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  cartTabRequested: boolean;
  setCartTabRequested: (v: boolean) => void;
};

const CartContext = createContext<CartContextType | null>(null);

function makeLineKey(itemId: string, variantLabel?: string) {
  return variantLabel ? `${itemId}__${variantLabel}` : itemId;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingItem, setPendingItemState] = useState<MenuItem | null>(null);
  const [pendingVariant, setPendingVariant] = useState<ItemVariant | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "", email: "" });
  const [cartTabRequested, setCartTabRequested] = useState(false);

  const setPendingItem = useCallback((item: MenuItem | null, variant?: ItemVariant) => {
    setPendingItemState(item);
    setPendingVariant(item ? (variant ?? null) : null);
  }, []);

  const addItem = useCallback((menuItem: MenuItem, specialInstructions?: string, variant?: ItemVariant, options?: SelectedOptions, appointmentDate?: string, appointmentTime?: string) => {
    const lineKey = makeLineKey(menuItem.id, variant?.label);
    setItems((prev) => {
      const existing = prev.find((i) => i.lineKey === lineKey);
      if (existing && !specialInstructions && !options && !appointmentDate) {
        return prev.map((i) =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem, quantity: 1, specialInstructions, selectedVariant: variant, selectedOptions: options, appointmentDate, appointmentTime, lineKey }];
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
  }, []);

  const updateQuantity = useCallback((lineKey: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.lineKey !== lineKey));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.lineKey === lineKey ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const updateSpecialInstructions = useCallback((lineKey: string, instructions: string) => {
    setItems((prev) =>
      prev.map((i) => (i.lineKey === lineKey ? { ...i, specialInstructions: instructions } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerInfo({ name: "", phone: "", email: "" });
  }, []);

  const total = items.reduce((sum, i) => {
    const price = i.selectedVariant ? i.selectedVariant.price : Number(i.menuItem.price);
    return sum + price * i.quantity;
  }, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, updateSpecialInstructions,
        clearCart, total, itemCount, isOpen, setIsOpen,
        pendingItem, setPendingItem, pendingVariant, customerInfo, setCustomerInfo,
        cartTabRequested, setCartTabRequested,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
