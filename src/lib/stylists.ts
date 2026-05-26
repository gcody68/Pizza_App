// Global seed stylists — single source of truth used across calendar, staff widget, bookkeeping
export interface SeedStylist {
  id: string;
  name: string;
  initials: string;
  color: string;       // hex avatar color
  colorLight: string;  // hex light tint for appointment cards
  colorBorder: string; // hex border for cards
}

export const SEED_STYLISTS: SeedStylist[] = [
  { id: "kelly",  name: "Kelly Stanton", initials: "KS", color: "#B8860B", colorLight: "#fdf6e3", colorBorder: "#e8d5a0" },
  { id: "abbey",  name: "Abbey Krutzer", initials: "AK", color: "#3A9B8F", colorLight: "#e8f7f5", colorBorder: "#a0ddd6" },
  { id: "nina",   name: "Nina Torres",   initials: "NT", color: "#C07080", colorLight: "#fdf0f2", colorBorder: "#e8b0bb" },
  { id: "marcus", name: "Marcus Bell",   initials: "MB", color: "#7B68C8", colorLight: "#f2f0fd", colorBorder: "#c4bcea" },
];
