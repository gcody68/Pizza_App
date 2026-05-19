import type { MealPeriod } from "@/hooks/useMenuItems";

export type StarterItem = {
  name: string;
  description: string;
  price: number;
  category: string;
  meal_period: MealPeriod;
  image_url: string;
  sort_order: number;
};

export const STARTER_ITEMS: StarterItem[] = [
  // Breakfast
  { name: "Classic Eggs Benedict",   description: "Two poached eggs with Canadian bacon on toasted English muffins topped with hollandaise.",   price: 14.50, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/7708514/pexels-photo-7708514.jpeg?auto=compress&cs=tinysrgb&w=800",   sort_order: 100 },
  { name: "Belgian Waffle Stack",    description: "Thick malted waffles topped with fresh strawberries, whipped cream and maple syrup.",        price: 12.00, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=800",    sort_order: 101 },
  { name: "Smoked Salmon Bagel",     description: "Toasted everything bagel with cream cheese, capers, red onion and lox.",                    price: 15.00, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/3957499/pexels-photo-3957499.jpeg?auto=compress&cs=tinysrgb&w=800",   sort_order: 102 },
  { name: "Continental Breakfast",   description: "A curated selection of pastries, fruit, yogurt and freshly brewed coffee.",                  price: 10.00, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/13949816/pexels-photo-13949816.jpeg?auto=compress&cs=tinysrgb&w=800", sort_order: 103 },
  { name: "Parfait",                 description: "Creamy layered yogurt parfait with house-made granola and seasonal fruit.",                  price:  5.00, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/11182249/pexels-photo-11182249.jpeg?auto=compress&cs=tinysrgb&w=800", sort_order: 104 },
  { name: "Sunrise Protein Bowl",    description: "Quinoa base with kale, sweet potato, black beans and a sunny-side-up egg.",                 price: 13.25, category: "Breakfast", meal_period: "breakfast", image_url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 105 },
  // Sides (all-day)
  { name: "Avocado Sourdough Toast", description: "Smashed avocado with radish, chili flakes and a squeeze of lime on rustic sourdough.",      price: 11.50, category: "Sides",     meal_period: "all-day",   image_url: "https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 110 },
  { name: "Salad",                   description: "Fresh mixed greens with house vinaigrette.",                                                 price:  8.00, category: "Sides",     meal_period: "all-day",   image_url: "https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 111 },
  // Lunch
  { name: "Pesto Pasta Primavera",   description: "Penne pasta with seasonal roasted vegetables and nut-free basil pesto.",                    price: 14.00, category: "Lunch",     meal_period: "lunch",     image_url: "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 200 },
  { name: "Turkey Club",             description: "Turkey club sandwich on sourdough bread with three types of cheese.",                       price:  8.50, category: "Lunch",     meal_period: "lunch",     image_url: "https://images.pexels.com/photos/5639682/pexels-photo-5639682.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 201 },
  { name: "Fish Tacos",              description: "Crispy beer-battered fish in warm corn tortillas with slaw and chipotle crema.",            price: 10.00, category: "Lunch",     meal_period: "lunch",     image_url: "https://images.pexels.com/photos/2092507/pexels-photo-2092507.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 202 },
  // Dinner
  { name: "Herb-Crusted Ribeye",     description: "12oz prime ribeye with garlic mashed potatoes and grilled asparagus.",                      price: 32.00, category: "Dinner",    meal_period: "dinner",    image_url: "https://images.pexels.com/photos/1251208/pexels-photo-1251208.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 300 },
  { name: "Pan-Seared Scallops",     description: "Jumbo scallops over creamy mushroom risotto with a lemon butter drizzle.",                 price: 28.50, category: "Dinner",    meal_period: "dinner",    image_url: "https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 301 },
  { name: "Wagyu Burger",            description: "Premium wagyu beef with truffle aioli, aged cheddar and brioche bun.",                      price: 22.00, category: "Dinner",    meal_period: "dinner",    image_url: "https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 302 },
  // Desserts
  { name: "Mixed Berry Parfait",     description: "Greek yogurt layered with house-made granola, honey and seasonal berries.",                 price:  8.50, category: "Desserts",  meal_period: "all-day",   image_url: "https://images.pexels.com/photos/4736077/pexels-photo-4736077.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 500 },
  { name: "Apple Galette",           description: "Rustic tart with spiced apples and a flaky buttery crust.",                                price:  9.00, category: "Desserts",  meal_period: "all-day",   image_url: "https://images.pexels.com/photos/6148207/pexels-photo-6148207.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 501 },
  { name: "New York Cheesecake",     description: "Classic creamy cheesecake with a graham cracker crust and macerated strawberries.",        price: 10.50, category: "Desserts",  meal_period: "all-day",   image_url: "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 502 },
  { name: "Tiramisu Classico",       description: "Layers of espresso-soaked ladyfingers and mascarpone cream dusted with cocoa.",            price:  9.50, category: "Desserts",  meal_period: "all-day",   image_url: "https://images.pexels.com/photos/6880219/pexels-photo-6880219.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 503 },
  // Drinks
  { name: "Caramel Macchiato",       description: "Double shot of espresso with steamed milk and a buttery caramel drizzle.",                 price:  5.50, category: "Drinks",    meal_period: "all-day",   image_url: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800",    sort_order: 600 },
  { name: "Green Tea",               description: "Premium loose-leaf green tea, delicately steeped.",                                        price:  5.00, category: "Drinks",    meal_period: "all-day",   image_url: "https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=800",  sort_order: 601 },
  { name: "Mocha Hot Chocoloate",    description: "Rich dark chocolate blended with espresso and steamed milk.",                              price:  5.00, category: "Drinks",    meal_period: "all-day",   image_url: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800",    sort_order: 602 },
];
