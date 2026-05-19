export type ThemeId =
  | "midnight-gold"
  | "ocean-breeze"
  | "matcha-garden"
  | "tangerine-disco"
  | "classic-diner"
  | "ube-soft"
  | "cocoa-roast"
  | "slate-minimalist"
  | "neon-night"
  | "sunwashed-citrus";

export type ThemePreset = {
  id: ThemeId;
  name: string;
  swatch: string;
  vars: Record<string, string>;
};

export const THEMES: ThemePreset[] = [
  {
    id: "midnight-gold",
    name: "Midnight Gold",
    swatch: "#C5933A",
    vars: {
      "--primary": "43 72% 55%",
      "--primary-foreground": "0 0% 7%",
      "--accent": "43 72% 55%",
      "--accent-foreground": "0 0% 7%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "43 72% 55%",
      "--gold": "43 72% 55%",
      "--gold-light": "43 72% 70%",
      "--gold-dark": "43 72% 40%",
    },
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    swatch: "#3FBFAD",
    vars: {
      "--primary": "172 55% 50%",
      "--primary-foreground": "180 15% 8%",
      "--accent": "172 55% 50%",
      "--accent-foreground": "180 15% 8%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "172 55% 50%",
      "--gold": "172 55% 50%",
      "--gold-light": "172 55% 65%",
      "--gold-dark": "172 55% 35%",
    },
  },
  {
    id: "matcha-garden",
    name: "Matcha Garden",
    swatch: "#5A8C5A",
    vars: {
      "--primary": "120 25% 45%",
      "--primary-foreground": "60 30% 95%",
      "--accent": "120 25% 45%",
      "--accent-foreground": "60 30% 95%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "120 25% 45%",
      "--gold": "120 25% 45%",
      "--gold-light": "120 25% 60%",
      "--gold-dark": "120 25% 32%",
    },
  },
  {
    id: "tangerine-disco",
    name: "Tangerine Disco",
    swatch: "#F28B50",
    vars: {
      "--primary": "25 85% 60%",
      "--primary-foreground": "15 15% 7%",
      "--accent": "340 60% 65%",
      "--accent-foreground": "15 15% 7%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "25 85% 60%",
      "--gold": "25 85% 60%",
      "--gold-light": "25 85% 72%",
      "--gold-dark": "25 85% 45%",
    },
  },
  {
    id: "classic-diner",
    name: "Classic Diner",
    swatch: "#D1342F",
    vars: {
      "--primary": "2 70% 50%",
      "--primary-foreground": "0 0% 98%",
      "--accent": "0 0% 75%",
      "--accent-foreground": "0 0% 8%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "2 70% 50%",
      "--gold": "2 70% 50%",
      "--gold-light": "2 70% 65%",
      "--gold-dark": "2 70% 38%",
    },
  },
  {
    id: "ube-soft",
    name: "Ube Soft",
    swatch: "#9B72CF",
    vars: {
      "--primary": "270 50% 62%",
      "--primary-foreground": "270 15% 8%",
      "--accent": "270 50% 62%",
      "--accent-foreground": "270 15% 8%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "270 50% 62%",
      "--gold": "270 50% 62%",
      "--gold-light": "270 50% 75%",
      "--gold-dark": "270 50% 45%",
    },
  },
  {
    id: "cocoa-roast",
    name: "Cocoa Roast",
    swatch: "#8B6347",
    vars: {
      "--primary": "25 40% 42%",
      "--primary-foreground": "35 30% 95%",
      "--accent": "35 45% 65%",
      "--accent-foreground": "25 20% 7%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "25 40% 42%",
      "--gold": "25 40% 42%",
      "--gold-light": "35 45% 65%",
      "--gold-dark": "25 40% 30%",
    },
  },
  {
    id: "slate-minimalist",
    name: "Slate Minimalist",
    swatch: "#2D2D2D",
    vars: {
      "--primary": "0 0% 12%",
      "--primary-foreground": "0 0% 98%",
      "--accent": "0 0% 12%",
      "--accent-foreground": "0 0% 98%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "0 0% 12%",
      "--gold": "0 0% 20%",
      "--gold-light": "0 0% 35%",
      "--gold-dark": "0 0% 10%",
    },
  },
  {
    id: "neon-night",
    name: "Neon Night",
    swatch: "#00D4FF",
    vars: {
      "--primary": "192 100% 50%",
      "--primary-foreground": "230 20% 5%",
      "--accent": "320 80% 58%",
      "--accent-foreground": "230 20% 5%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "192 100% 50%",
      "--gold": "192 100% 50%",
      "--gold-light": "192 100% 65%",
      "--gold-dark": "192 100% 35%",
    },
  },
  {
    id: "sunwashed-citrus",
    name: "Sunwashed Citrus",
    swatch: "#F2C94C",
    vars: {
      "--primary": "45 85% 60%",
      "--primary-foreground": "45 15% 7%",
      "--accent": "90 50% 55%",
      "--accent-foreground": "45 15% 7%",
      "--destructive": "0 84% 60%",
      "--destructive-foreground": "0 0% 95%",
      "--ring": "45 85% 60%",
      "--gold": "45 85% 60%",
      "--gold-light": "45 85% 72%",
      "--gold-dark": "45 85% 45%",
    },
  },
];

export function getThemeById(id: string): ThemePreset {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
