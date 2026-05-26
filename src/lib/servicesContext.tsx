import { createContext, useContext, useState, type ReactNode } from "react";

export type ServiceCategory = "cuts" | "color" | "styling" | "treatments";

export interface SalonService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number;       // minutes
  processingGap: number;  // minutes
  description: string;
  image: string;
  popular?: boolean;
}

const DEFAULT_SERVICES: SalonService[] = [
  { id: "s1",   name: "Signature Cut & Style",    category: "cuts",       price: 65,  duration: 60,  processingGap: 0,  popular: true,  description: "Precision cut tailored to your face shape, finished with a professional blowout.",             image: "https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s2",   name: "Balayage & Gloss",          category: "color",      price: 185, duration: 150, processingGap: 45, popular: true,  description: "Hand-painted highlights with a gloss treatment for natural, sun-kissed results.",              image: "https://images.pexels.com/photos/7755250/pexels-photo-7755250.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s3",   name: "Root Touch-Up",             category: "color",      price: 75,  duration: 60,  processingGap: 25,                 description: "Single-process color applied to new growth for seamless, full coverage.",                      image: "https://images.pexels.com/photos/3993435/pexels-photo-3993435.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s4",   name: "Blowout",                   category: "styling",    price: 55,  duration: 45,  processingGap: 0,                  description: "Professional shampoo, blow-dry, and style using premium thermal products.",                    image: "https://images.pexels.com/photos/3738340/pexels-photo-3738340.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s5",   name: "Keratin Smoothing",         category: "treatments", price: 220, duration: 150, processingGap: 60,                 description: "Eliminates frizz and tames texture for up to 4 months of silky smooth hair.",                  image: "https://images.pexels.com/photos/4612274/pexels-photo-4612274.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s6",   name: "Highlights",                category: "color",      price: 145, duration: 120, processingGap: 45,                 description: "Foil highlights placed to brighten and add dimension throughout.",                             image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s7",   name: "Bang Trim",                 category: "cuts",       price: 20,  duration: 15,  processingGap: 0,                  description: "Quick trim to maintain shape and length between full appointments.",                           image: "https://images.pexels.com/photos/3992876/pexels-photo-3992876.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s8",   name: "Deep Conditioning",         category: "treatments", price: 45,  duration: 30,  processingGap: 0,                  description: "Intensive moisture treatment that restores softness and shine to dry hair.",                   image: "https://images.pexels.com/photos/3993318/pexels-photo-3993318.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s9",   name: "Men's Haircut",             category: "cuts",       price: 40,  duration: 30,  processingGap: 0,                  description: "Classic or modern cut with a professional finish. Includes shampoo and style.",                image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s10",  name: "Curling / Flat Iron Style", category: "styling",    price: 55,  duration: 45,  processingGap: 0,                  description: "Heat-styled finish with curls, waves or a sleek straight look.",                              image: "https://images.pexels.com/photos/3807570/pexels-photo-3807570.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { id: "s11",  name: "Scalp Treatment",           category: "treatments", price: 45,  duration: 30,  processingGap: 0,                  description: "Targeted scalp therapy with nourishing serums to improve health and stimulate growth.",         image: "https://images.pexels.com/photos/3993318/pexels-photo-3993318.jpeg?auto=compress&cs=tinysrgb&w=400" },
];

interface ServicesCtx {
  services: SalonService[];
  updateService: (id: string, patch: Partial<SalonService>) => void;
  addService: (category: ServiceCategory) => void;
  deleteService: (id: string) => void;
}

const Ctx = createContext<ServicesCtx>({
  services: DEFAULT_SERVICES,
  updateService: () => {},
  addService: () => {},
  deleteService: () => {},
});

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<SalonService[]>(DEFAULT_SERVICES);

  const updateService = (id: string, patch: Partial<SalonService>) =>
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const addService = (category: ServiceCategory) =>
    setServices(prev => [...prev, {
      id: `new-${Date.now()}`,
      name: "New Service",
      category,
      price: 75,
      duration: 60,
      processingGap: 0,
      description: "",
      image: "",
    }]);

  const deleteService = (id: string) =>
    setServices(prev => prev.filter(s => s.id !== id));

  return (
    <Ctx.Provider value={{ services, updateService, addService, deleteService }}>
      {children}
    </Ctx.Provider>
  );
}

export function useServices() { return useContext(Ctx); }

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  cuts: "Cuts",
  color: "Color",
  styling: "Styling",
  treatments: "Treatments",
};
