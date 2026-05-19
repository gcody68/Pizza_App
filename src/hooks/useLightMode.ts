import { useState, useEffect, useCallback } from "react";

const LIGHT_OVERRIDES: Record<string, string> = {
  "--background": "0 0% 97%",
  "--foreground": "0 0% 10%",
  "--card": "0 0% 100%",
  "--card-foreground": "0 0% 10%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "0 0% 10%",
  "--secondary": "0 0% 92%",
  "--secondary-foreground": "0 0% 20%",
  "--muted": "0 0% 92%",
  "--muted-foreground": "0 0% 40%",
  "--border": "0 0% 85%",
  "--input": "0 0% 85%",
};

let savedDarkVars: Record<string, string> = {};

export function useLightMode() {
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem("light-mode") === "true";
  });

  const applyMode = useCallback((light: boolean) => {
    const root = document.documentElement;
    if (light) {
      // Save current dark vars
      Object.keys(LIGHT_OVERRIDES).forEach((key) => {
        savedDarkVars[key] = root.style.getPropertyValue(key) || getComputedStyle(root).getPropertyValue(key).trim();
      });
      Object.entries(LIGHT_OVERRIDES).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    } else {
      // Restore dark vars
      Object.entries(savedDarkVars).forEach(([key, value]) => {
        if (value) root.style.setProperty(key, value);
      });
    }
  }, []);

  useEffect(() => {
    applyMode(isLight);
  }, [isLight, applyMode]);

  const toggle = useCallback(() => {
    setIsLight((prev) => {
      const next = !prev;
      localStorage.setItem("light-mode", String(next));
      return next;
    });
  }, []);

  return { isLight, toggle };
}
