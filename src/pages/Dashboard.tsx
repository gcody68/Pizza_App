import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Scissors, User, CalendarDays, ChartBar as BarChart3, Bell, CreditCard, Settings, Clock, ChevronRight, Globe, LogOut, Menu, X } from "lucide-react";
import BookkeepingTab from "@/components/BookkeepingTab";
import HoursServicesTab from "@/components/HoursServicesTab";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";

type TabId = "profile" | "branding" | "hours" | "payment" | "bookkeeping" | "notifications";

const NAV: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile",      label: "Profile",               icon: User,         description: "Salon info & owner details" },
  { id: "branding",     label: "Branding",               icon: Settings,     description: "Colors, logo & theme" },
  { id: "hours",        label: "Hours & Services",        icon: Clock,        description: "Schedules, durations & pricing" },
  { id: "payment",      label: "Payment",                 icon: CreditCard,   description: "Stripe & checkout settings" },
  { id: "bookkeeping",  label: "Bookkeeping & Payouts",   icon: BarChart3,    description: "Revenue, tips & payroll" },
  { id: "notifications", label: "Notifications",          icon: Bell,         description: "SMS & email automation" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: TabId }>();
  const [activeTab, setActiveTab] = useState<TabId>(tab ?? "profile");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: settings } = useRestaurantSettings();
  const restaurantId = settings?.id ?? "";

  useEffect(() => {
    if (tab) setActiveTab(tab as TabId);
  }, [tab]);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setMobileSidebarOpen(false);
    navigate(`/dashboard/${id}`, { replace: true });
  };

  const smsActive = !!(settings?.sms_enabled);
  const emailActive = !!(settings?.email_enabled);
  const notifBadge = [
    settings?.sms_appointment_confirmation,
    settings?.sms_24h_reminder,
    settings?.sms_2h_reminder,
    settings?.sms_no_show_followup,
    settings?.email_appointment_confirmation,
    settings?.email_24h_reminder,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(35,25%,97%)", fontFamily: "'Inter',sans-serif" }}>

      {/* ── Top Navbar ── */}
      <header className="flex-shrink-0 bg-white border-b border-[hsl(30,14%,88%)] h-14 flex items-center px-4 lg:px-6 gap-4 z-30">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
          onClick={() => setMobileSidebarOpen(v => !v)}
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif text-lg font-semibold text-stone-800 tracking-tight">Loomis Salon</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate("/calendar")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            onClick={() => navigate("/")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" /> Booking Site
          </button>
          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <>
          {/* Mobile backdrop */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 bg-black/25 z-20 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          )}

          <aside className={`
            fixed top-14 left-0 bottom-0 z-20 w-64 bg-white border-r border-[hsl(30,14%,88%)] flex flex-col
            transition-transform duration-250
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            lg:relative lg:top-auto lg:translate-x-0 lg:flex-shrink-0
          `}>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {NAV.map(({ id, label, icon: Icon, description }) => {
                const isActive = activeTab === id;
                const showBadge = id === "notifications" && notifBadge > 0;
                return (
                  <button
                    key={id}
                    onClick={() => selectTab(id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group ${
                      isActive
                        ? "bg-stone-900 text-white"
                        : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isActive ? "bg-white/15" : "bg-stone-100 group-hover:bg-stone-200"
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-stone-500 group-hover:text-stone-700"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${isActive ? "text-white" : ""}`}>{label}</p>
                      <p className={`text-[10px] mt-0.5 leading-snug truncate ${isActive ? "text-white/60" : "text-stone-400"}`}>{description}</p>
                    </div>
                    {showBadge && (
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">{notifBadge}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-stone-100">
              <button
                onClick={() => navigate("/calendar")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <CalendarDays className="w-4 h-4 text-stone-400" />
                Open Calendar
                <ChevronRight className="w-3.5 h-3.5 text-stone-300 ml-auto" />
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-500 hover:bg-stone-50 transition-colors">
                <LogOut className="w-4 h-4 text-stone-300" />
                Sign Out
              </button>
            </div>
          </aside>
        </>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
            <TabContent tab={activeTab} restaurantId={restaurantId} smsActive={smsActive} emailActive={emailActive} />
          </div>
        </main>
      </div>
    </div>
  );
}

function TabContent({ tab, restaurantId, smsActive, emailActive }: {
  tab: TabId; restaurantId: string; smsActive: boolean; emailActive: boolean;
}) {
  switch (tab) {
    case "bookkeeping": return <BookkeepingTab restaurantId={restaurantId} />;
    case "hours": return <HoursServicesTab />;
    case "notifications": return <NotificationsTab restaurantId={restaurantId} smsActive={smsActive} emailActive={emailActive} />;
    case "profile": return <ProfileTab />;
    case "branding": return <BrandingTab />;
    case "payment": return <PaymentTab />;
    default: return <ProfileTab />;
  }
}

// ── Placeholder tabs ───────────────────────────────────────────────────────────
function ProfileTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Salon Profile" sub="Your business information displayed on the public booking site." />
      <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
        {[
          { label: "Salon Name", placeholder: "Loomis Salon", value: "Loomis Salon" },
          { label: "Address", placeholder: "2450 N Lincoln Ave, Chicago, IL 60614", value: "2450 N Lincoln Ave, Chicago, IL 60614" },
          { label: "Phone Number", placeholder: "(312) 555-0100", value: "(312) 555-0100" },
          { label: "Instagram Handle", placeholder: "@loomissalon", value: "@loomissalon" },
        ].map(({ label, placeholder, value }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">{label}</label>
            <input
              defaultValue={value}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 focus:bg-white transition-all"
            />
          </div>
        ))}
        <button className="gradient-gold text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">Save Changes</button>
      </div>
    </div>
  );
}

function BrandingTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Branding" sub="Customize your salon's visual identity." />
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <p className="text-sm text-stone-400 text-center py-8">Branding customization coming soon.</p>
      </div>
    </div>
  );
}

function PaymentTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Payment" sub="Connect Stripe to accept deposits and checkout payments." />
      <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-100 bg-stone-50">
          <div className="w-10 h-10 rounded-xl bg-[hsl(230,60%,55%)]/10 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-5 h-5 text-[hsl(230,60%,55%)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">Stripe</p>
            <p className="text-xs text-stone-400 mt-0.5">Connect your Stripe account to accept card payments and manage payouts.</p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors">Connect</button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ restaurantId: _restaurantId, smsActive, emailActive }: { restaurantId: string; smsActive: boolean; emailActive: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <SectionHead title="Notifications" sub="Configure SMS and email automations for your clients." />
      <div className="space-y-3">
        {[
          { label: "SMS Reminders", sub: "Twilio · Appointment confirmations & reminders", active: smsActive, path: "/notifications" },
          { label: "Email Blast & Reminders", sub: "Resend · Transactional & marketing emails", active: emailActive, path: "/notifications" },
        ].map(({ label, sub, active, path }) => (
          <button key={label} onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all text-left"
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-500 animate-pulse-dot" : "bg-stone-300"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-800">{label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-stone-800">{title}</h1>
      <p className="text-sm text-stone-400 mt-1 leading-relaxed">{sub}</p>
    </div>
  );
}
