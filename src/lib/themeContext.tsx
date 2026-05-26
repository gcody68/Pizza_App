import { createContext, useContext, useState, type ReactNode } from "react";

export interface SiteTheme {
  id: string;
  label: string;
  bg: string;
  accent: string;
  accentText: string;
  pill: string;
  pillActive: string;
  pillActiveText: string;
  cardBorder: string;
  buttonBg: string;
  buttonText: string;
}

export const SITE_THEMES: SiteTheme[] = [
  {
    id: "luxury",
    label: "Luxury Boutique",
    bg: "hsl(35,25%,97%)",
    accent: "hsl(38,65%,55%)",
    accentText: "#fff",
    pill: "hsl(30,14%,88%)",
    pillActive: "hsl(20,14%,10%)",
    pillActiveText: "#fff",
    cardBorder: "hsl(30,14%,88%)",
    buttonBg: "hsl(20,14%,10%)",
    buttonText: "#fff",
  },
  {
    id: "earthy",
    label: "Earthy Spa",
    bg: "hsl(130,18%,94%)",
    accent: "hsl(140,25%,32%)",
    accentText: "#fff",
    pill: "hsl(130,12%,82%)",
    pillActive: "hsl(140,25%,32%)",
    pillActiveText: "#fff",
    cardBorder: "hsl(130,12%,84%)",
    buttonBg: "hsl(30,20%,22%)",
    buttonText: "#fff",
  },
  {
    id: "glam",
    label: "Modern Glam",
    bg: "hsl(345,30%,96%)",
    accent: "hsl(340,40%,52%)",
    accentText: "#fff",
    pill: "hsl(345,16%,86%)",
    pillActive: "hsl(215,25%,22%)",
    pillActiveText: "#fff",
    cardBorder: "hsl(345,16%,87%)",
    buttonBg: "hsl(215,25%,22%)",
    buttonText: "#fff",
  },
];

interface ThemeCtx {
  theme: SiteTheme;
  setThemeId: (id: string) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: SITE_THEMES[0], setThemeId: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState("luxury");
  const theme = SITE_THEMES.find(t => t.id === themeId) ?? SITE_THEMES[0];
  return <Ctx.Provider value={{ theme, setThemeId }}>{children}</Ctx.Provider>;
}

export function useSiteTheme() { return useContext(Ctx); }
