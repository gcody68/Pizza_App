import { useNavigate } from "react-router-dom";
import { CalendarDays, Scissors, Globe, Bell, ChevronRight } from "lucide-react";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: settings } = useRestaurantSettings();

  const smsOn = !!(settings?.sms_enabled);
  const emailOn = !!(settings?.email_enabled);
  const smsEventsOn = [
    settings?.sms_appointment_confirmation,
    settings?.sms_24h_reminder,
    settings?.sms_2h_reminder,
    settings?.sms_no_show_followup,
  ].filter(Boolean).length;
  const emailEventsOn = [
    settings?.email_appointment_confirmation,
    settings?.email_24h_reminder,
    settings?.email_marketing_blasts,
    settings?.email_review_request,
  ].filter(Boolean).length;
  const totalNotifActive = smsEventsOn + emailEventsOn;

  const notifStatusLabel = !smsOn && !emailOn
    ? "Not configured"
    : totalNotifActive > 0
    ? `${totalNotifActive} trigger${totalNotifActive !== 1 ? "s" : ""} active`
    : "Channels on, no triggers";

  return (
    <div className="min-h-screen" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-white border-b border-stone-100 px-6 h-14 flex items-center gap-3">
        <Scissors className="w-5 h-5 text-[hsl(38,65%,55%)]" />
        <span className="text-sm font-bold text-stone-800">Loomis Salon</span>
        <span className="ml-auto text-xs text-stone-400">Owner Portal</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Good morning</h1>

        {/* Main nav cards */}
        {[
          { label: "Calendar & Bookings", sub: "Manage today's appointments", icon: CalendarDays, path: "/calendar" },
          { label: "Public Booking Site", sub: "Preview & share your booking page", icon: Globe, path: "/" },
        ].map(({ label, sub, icon: Icon, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
          </button>
        ))}

        {/* Notifications card */}
        <button
          onClick={() => navigate("/notifications")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all text-left group"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${totalNotifActive > 0 ? "bg-[hsl(38,65%,55%)]/15" : "bg-stone-100"}`}>
            <Bell className={`w-5 h-5 ${totalNotifActive > 0 ? "text-[hsl(38,65%,55%)]" : "text-stone-600"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-stone-800">Notifications</p>
              {totalNotifActive > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {totalNotifActive} active
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-stone-400">{notifStatusLabel}</p>
              {(smsOn || emailOn) && (
                <div className="flex items-center gap-1.5">
                  {smsOn && <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">SMS</span>}
                  {emailOn && <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">Email</span>}
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
        </button>

      </main>
    </div>
  );
}
