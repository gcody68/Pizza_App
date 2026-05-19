/**
 * DemoModeContext
 *
 * When present in the tree, all Supabase-backed hooks route through these
 * callbacks instead of hitting the database.  The Demo page provides this
 * context so the real app components work fully in localStorage-only mode.
 */

import { createContext, useContext, ReactNode } from "react";
import type { MenuItem, MealPeriod } from "@/hooks/useMenuItems";
import type { RestaurantSettings } from "@/hooks/useRestaurantSettings";
import type { GalleryItem } from "@/hooks/useGallery";

export type DemoOrderPayload = {
  customerName: string;
  customerPhone: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
};

export type DemoModeContextType = {
  /** true when running inside the demo page */
  isDemo: true;

  // settings
  updateSettings: (updates: Partial<RestaurantSettings>) => void;
  getSettings: () => RestaurantSettings;

  // menu items
  getMenuItems: () => MenuItem[];
  createMenuItem: (item: Omit<MenuItem, "id" | "sort_order" | "is_placeholder">) => void;
  upsertMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  clearMenuItems: () => void;
  loadSampleMenu: () => void;
  decrementStock: (items: { id: string; quantity: number }[]) => void;

  // gallery
  getGalleryItems: () => GalleryItem[];
  addGalleryItem: (item: { image_url: string; caption?: string }) => void;
  deleteGalleryItem: (id: string) => void;

  // orders
  submitOrder: (payload: DemoOrderPayload) => void;
};

const DemoModeContext = createContext<DemoModeContextType | null>(null);

export function DemoModeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: DemoModeContextType;
}) {
  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

/** Returns the demo context if present, null otherwise. */
export function useDemoMode(): DemoModeContextType | null {
  return useContext(DemoModeContext);
}
