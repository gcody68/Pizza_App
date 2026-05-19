import type { MealPeriod } from "@/hooks/useMenuItems";

export type MockMenuItem = {
  name: string;
  description: string;
  price: number;
  category: string;
  meal_period: MealPeriod;
  image_url: string;
  sort_order: number;
  duration_minutes?: number;
};

export type MockGalleryItem = {
  image_url: string;
  caption: string;
};

export type MockRestaurantInfo = {
  business_name: string;
  business_address: string;
  business_phone: string;
};

const BASE = "https://dgogwezhlhbcyazwpfwe.supabase.co/storage/v1/object/public/temp.images";

// Fallback used only if the DB demo_menu_items table is unreachable.
export const MOCK_MENU_ITEMS: MockMenuItem[] = [
  // Cuts
  { name: "Women's Haircut & Style",  description: "Precision cut and blowout styled to your preference. Includes shampoo and conditioning treatment.", price: 65.00,  category: "Cuts",       meal_period: "all-day", image_url: `${BASE}/Women's_Haircut_%26_Style.png`,  sort_order: 100, duration_minutes: 60  },
  { name: "Men's Haircut",            description: "Classic or modern cut with a professional finish. Includes shampoo and style.",                       price: 40.00,  category: "Cuts",       meal_period: "all-day", image_url: `${BASE}/Men's_Haircut.png`,               sort_order: 101, duration_minutes: 30  },
  { name: "Children's Haircut",       description: "Gentle, patient haircut for kids 12 and under. Includes shampoo and style.",                         price: 30.00,  category: "Cuts",       meal_period: "all-day", image_url: `${BASE}/Children's_Haircut.png`,          sort_order: 102, duration_minutes: 30  },
  { name: "Bang Trim",                description: "Quick fringe trim to keep your style sharp between cuts.",                                            price: 15.00,  category: "Cuts",       meal_period: "all-day", image_url: `${BASE}/Bang_Trim.png`,                   sort_order: 103, duration_minutes: 15  },
  // Color
  { name: "Full Color",               description: "Single-process all-over color with professional formulation and gloss rinse.",                        price: 85.00,  category: "Color",      meal_period: "all-day", image_url: `${BASE}/full_color.png`,                  sort_order: 200, duration_minutes: 90  },
  { name: "Root Touch-Up",            description: "Single-process color application at the roots to refresh your existing color.",                       price: 55.00,  category: "Color",      meal_period: "all-day", image_url: `${BASE}/Root_Touch-Up.png`,               sort_order: 201, duration_minutes: 60  },
  { name: "Highlights / Balayage",    description: "Hand-painted or foil highlights for a natural, sun-kissed dimensional look.",                         price: 120.00, category: "Color",      meal_period: "all-day", image_url: `${BASE}/Highlights_Balayage.png`,         sort_order: 202, duration_minutes: 120 },
  // Styling
  { name: "Blowout",                  description: "Shampoo, condition and professional blowout styled to perfection.",                                   price: 45.00,  category: "Styling",    meal_period: "all-day", image_url: `${BASE}/Blowout.png`,                     sort_order: 300, duration_minutes: 45  },
  { name: "Curling / Flat Iron Style",description: "Heat-styled finish with curls, waves or a sleek straight look.",                                      price: 50.00,  category: "Styling",    meal_period: "all-day", image_url: `${BASE}/Curling_Flat_Iron_Style.png`,     sort_order: 301, duration_minutes: 45  },
  // Treatments
  { name: "Keratin Smoothing",        description: "Professional keratin treatment that eliminates frizz and adds lasting shine for up to 3 months.",    price: 200.00, category: "Treatments", meal_period: "all-day", image_url: `${BASE}/Keratin_Smoothing.png`,           sort_order: 400, duration_minutes: 150 },
  { name: "Scalp Treatment",          description: "Targeted scalp therapy with nourishing serums to improve health and stimulate growth.",               price: 55.00,  category: "Treatments", meal_period: "all-day", image_url: `${BASE}/Scalp_Treatment.png`,             sort_order: 401, duration_minutes: 45  },
];

export const MOCK_GALLERY_ITEMS: MockGalleryItem[] = [
  { image_url: `${BASE}/Gallery_1.png`, caption: "Beautiful transformations every day" },
  { image_url: `${BASE}/Gallery_2.png`, caption: "Expert color and styling" },
  { image_url: `${BASE}/Women's_Haircut_%26_Style.png`, caption: "Precision cuts for every style" },
];

export const MOCK_RESTAURANT_INFO: MockRestaurantInfo = {
  business_name: "Loomis Salon",
  business_address: "1234 Main Street, Springfield, IL 62701",
  business_phone: "(217) 555-0142",
};
