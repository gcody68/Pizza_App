import { useMemo } from "react";
import {
  useRestaurantSettings,
  DEFAULT_SERVICE_HOURS,
  type ServiceHours,
  type ShiftConfig,
} from "./useRestaurantSettings";
import type { MealPeriod } from "./useMenuItems";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export type PeriodStatus = {
  active: boolean;
  minutesUntilEnd: number | null;
  endLabel: string;
  startLabel: string;
  enabled: boolean;
};

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

export type MealPeriodConfig = {
  serviceHours: ServiceHours;
  currentPeriod: MealPeriod;
  unavailableDisplay: "hide" | "gray";
  getPeriodStatus: (period: MealPeriod) => PeriodStatus;
  isPeriodActive: (period: MealPeriod) => boolean;
};

export function useMealPeriodConfig(restaurantId?: string | null): MealPeriodConfig {
  const { data: settings } = useRestaurantSettings(restaurantId);

  return useMemo(() => {
    const serviceHours: ServiceHours = settings?.service_hours ?? DEFAULT_SERVICE_HOURS;
    const unavailableDisplay: "hide" | "gray" =
      settings?.unavailable_display === "gray" ? "gray" : "hide";

    const getPeriodStatus = (period: MealPeriod): PeriodStatus => {
      if (period === "all-day") {
        return {
          active: true,
          minutesUntilEnd: null,
          endLabel: "",
          startLabel: "",
          enabled: true,
        };
      }
      const shift = serviceHours[period as keyof ServiceHours];
      return shiftStatus(shift);
    };

    const isPeriodActive = (period: MealPeriod): boolean => {
      if (period === "all-day") return true;
      return getPeriodStatus(period).active;
    };

    const now = nowMinutes();
    let currentPeriod: MealPeriod | null = null;
    const periods: MealPeriod[] = ["breakfast", "lunch", "dinner"];

    // Find the currently active period
    for (const p of periods) {
      const shift = serviceHours[p as keyof ServiceHours];
      if (shift.enabled) {
        const start = timeToMinutes(shift.start);
        const end = timeToMinutes(shift.end);
        if (now >= start && now < end) {
          currentPeriod = p;
          break;
        }
      }
    }

    // If no period is active, use the next upcoming enabled period, or the last enabled period
    if (!currentPeriod) {
      let nextPeriod: MealPeriod | null = null;
      let lastEnabled: MealPeriod | null = null;
      for (const p of periods) {
        const shift = serviceHours[p as keyof ServiceHours];
        if (shift.enabled) {
          lastEnabled = p;
          if (!nextPeriod && timeToMinutes(shift.start) > now) {
            nextPeriod = p;
          }
        }
      }
      currentPeriod = nextPeriod ?? lastEnabled ?? "dinner";
    }

    return { serviceHours, currentPeriod, unavailableDisplay, getPeriodStatus, isPeriodActive };
  }, [settings]);
}
