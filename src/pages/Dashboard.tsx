import { useNavigate } from "react-router-dom";
import { CalendarDays, Scissors, Globe } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-white border-b border-stone-100 px-6 h-14 flex items-center gap-3">
        <Scissors className="w-5 h-5 text-[hsl(38,65%,55%)]" />
        <span className="text-sm font-bold text-stone-800">Loomis Salon</span>
        <span className="ml-auto text-xs text-stone-400">Owner Portal</span>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Good morning</h1>
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
            <div>
              <p className="text-sm font-semibold text-stone-800">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
            </div>
          </button>
        ))}
      </main>
    </div>
  );
}
