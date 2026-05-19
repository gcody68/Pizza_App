import { useMemo } from "react";
import { useDemo } from "@/contexts/DemoContext";
import { DEFAULT_SERVICE_HOURS, type ServiceHours, type ShiftConfig } from "./useRestaurantSettings";
import type { MealPeriod } from "./useMenuItems";
import type { PeriodStatus, MealPeriodConfig } from "./useMealPeriodConfig";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function shiftStatus(shift: ShiftConfig): PeriodStatus {
  const now = nowMinutes();
  const start = timeToMinutes(shift.start);
  const end = timeToMinutes(shift.end);
  const active = shift.enabled && now >= start && now < end;
  const minutesUntilEnd = active ? end - now : null;

  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return m === 0 ? `${displayH}:00 ${period}` : `${displayH}:${String(m).padStart(2, "0")} ${period}`;
  };

  return {
    active,
    minutesUntilEnd,
    endLabel: fmt(shift.end),
    startLabel: fmt(shift.start),
    enabled: shift.enabled,
  };
}

export function useDemoMealPeriodConfig(): MealPeriodConfig {
  const { settings } = useDemo();

  return useMemo(() => {
    const serviceHours: ServiceHours = settings.service_hours ?? DEFAULT_SERVICE_HOURS;
    const unavailableDisplay: "hide" | "gray" =
      settings.unavailable_display === "gray" ? "gray" : "hide";

    const getPeriodStatus = (period: MealPeriod): PeriodStatus => {
      if (period === "all-day") {
        return { active: true, minutesUntilEnd: null, endLabel: "", startLabel: "", enabled: true };
      }
      const shift = serviceHours[period as keyof ServiceHours];
      return shiftStatus(shift);
    };

    const isPeriodActive = (period: MealPeriod): boolean => {
      if (period === "all-day") return true;
      return getPeriodStatus(period).active;
    };

    const now = nowMinutes();
    let currentPeriod: MealPeriod = "dinner";
    for (const p of ["breakfast", "lunch", "dinner"] as MealPeriod[]) {
      const shift = serviceHours[p as keyof ServiceHours];
      if (shift.enabled) {
        const start = timeToMinutes(shift.start);
        const end = timeToMinutes(shift.end);
        if (now >= start && now < end) { currentPeriod = p; break; }
      }
    }

    return { serviceHours, currentPeriod, unavailableDisplay, getPeriodStatus, isPeriodActive };
  }, [settings]);
}
