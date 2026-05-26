import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Scissors, User, CalendarDays, ChartBar as BarChart3, Bell, CreditCard, Settings, Clock, ChevronRight, Globe, LogOut, Menu, X, Key, ExternalLink } from "lucide-react";
import BookkeepingTab from "@/components/BookkeepingTab";
import HoursServicesTab from "@/components/HoursServicesTab";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";

type TabId = "profile" | "branding" | "hours" | "payment" | "schedule" | "staff";

const NAV: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: "profile",  label: "Profile",        icon: User,       description: "Salon info & owner details" },
  { id: "branding", label: "Branding",        icon: Settings,   description: "Colors, logo & theme" },
  { id: "hours",    label: "Service Hours",   icon: Clock,      description: "Schedules, durations & pricing" },
  { id: "payment",  label: "Payment",         icon: CreditCard, description: "Stripe & checkout settings" },
  { id: "schedule", label: "Schedule",        icon: BarChart3,  description: "Revenue, tips & payroll" },
  { id: "staff",    label: "Staff",           icon: Bell,       description: "Team management & notifications" },
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

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter',sans-serif" }}>

      {/* ── Top Navbar ── */}
      <header
        className="flex-shrink-0 h-14 flex items-center px-4 lg:px-6 gap-4 z-30"
        style={{ background: "hsl(215,28%,17%)", borderBottom: "1px solid hsl(215,25%,22%)" }}
      >
        <button
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "hsl(215,20%,60%)" }}
          onClick={() => setMobileSidebarOpen(v => !v)}
        >
          {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif text-lg font-semibold text-white tracking-tight">Loomis Salon</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => navigate("/calendar")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ color: "hsl(215,20%,65%)", border: "1px solid hsl(215,25%,28%)" }}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            onClick={() => navigate("/")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ color: "hsl(215,20%,65%)", border: "1px solid hsl(215,25%,28%)" }}
          >
            <Globe className="w-3.5 h-3.5" /> Booking Site
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "hsl(215,25%,28%)", color: "hsl(215,20%,60%)" }}
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
          )}

          <aside
            className={`
              fixed top-14 left-0 bottom-0 z-20 w-64 flex flex-col
              transition-transform duration-250
              ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
              lg:relative lg:top-auto lg:translate-x-0 lg:flex-shrink-0
            `}
            style={{ background: "hsl(215,28%,17%)", borderRight: "1px solid hsl(215,25%,22%)" }}
          >
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {NAV.map(({ id, label, icon: Icon, description }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => selectTab(id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: isActive ? "hsl(215,25%,28%)" : "transparent",
                      color: isActive ? "white" : "hsl(215,20%,60%)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isActive ? "hsl(215,25%,38%)" : "hsl(215,25%,22%)" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: isActive ? "white" : "hsl(215,20%,55%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{label}</p>
                      <p
                        className="text-[10px] mt-0.5 leading-snug truncate"
                        style={{ color: isActive ? "hsl(215,20%,70%)" : "hsl(215,20%,42%)" }}
                      >
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* ── Divider + bottom links ── */}
            <div className="p-3 space-y-0.5" style={{ borderTop: "1px solid hsl(215,25%,22%)" }}>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ color: "hsl(38,65%,60%)" }}
              >
                <Globe className="w-4 h-4" style={{ color: "hsl(38,65%,55%)" }} />
                <span>View My Public Site</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </button>
              <button
                onClick={() => navigate("/calendar")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ color: "hsl(215,20%,60%)" }}
              >
                <CalendarDays className="w-4 h-4" style={{ color: "hsl(215,20%,50%)" }} />
                <span>Calendar &amp; Booking</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-30" />
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ color: "hsl(215,20%,60%)" }}
              >
                <Key className="w-4 h-4" style={{ color: "hsl(215,20%,50%)" }} />
                <span>Change Password</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ color: "hsl(215,20%,45%)" }}
              >
                <LogOut className="w-4 h-4" style={{ color: "hsl(215,20%,38%)" }} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto" style={{ background: "hsl(215,22%,13%)" }}>
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
            {/* Section heading renders in slate-aware white text; card content stays on neutral surface */}
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
    case "schedule": return <BookkeepingTab restaurantId={restaurantId} />;
    case "hours": return <HoursServicesTab />;
    case "staff": return <StaffTab restaurantId={restaurantId} smsActive={smsActive} emailActive={emailActive} />;
    case "profile": return <ProfileTab />;
    case "branding": return <BrandingTab />;
    case "payment": return <PaymentTab />;
    default: return <ProfileTab />;
  }
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Salon Profile" sub="Your business information displayed on the public booking site." />
      <div className="rounded-2xl border p-6 space-y-5" style={{ background: "hsl(215,25%,18%)", borderColor: "hsl(215,25%,24%)" }}>
        {[
          { label: "Salon Name", placeholder: "Loomis Salon", value: "Loomis Salon" },
          { label: "Address", placeholder: "2450 N Lincoln Ave, Chicago, IL 60614", value: "2450 N Lincoln Ave, Chicago, IL 60614" },
          { label: "Phone Number", placeholder: "(312) 555-0100", value: "(312) 555-0100" },
          { label: "Instagram Handle", placeholder: "@loomissalon", value: "@loomissalon" },
        ].map(({ label, placeholder, value }) => (
          <div key={label}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "hsl(215,20%,55%)" }}>{label}</label>
            <input
              defaultValue={value}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-all"
              style={{ background: "hsl(215,28%,14%)", borderColor: "hsl(215,25%,28%)", color: "hsl(215,15%,85%)" }}
            />
          </div>
        ))}
        <button className="gradient-gold text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ── Branding Tab ───────────────────────────────────────────────────────────────
function BrandingTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Branding" sub="Customize your salon's visual identity." />
      <div className="rounded-2xl border p-6" style={{ background: "hsl(215,25%,18%)", borderColor: "hsl(215,25%,24%)" }}>
        <p className="text-sm text-center py-8" style={{ color: "hsl(215,20%,45%)" }}>Branding customization coming soon.</p>
      </div>
    </div>
  );
}

// ── Payment Tab ────────────────────────────────────────────────────────────────
function PaymentTab() {
  return (
    <div className="space-y-6">
      <SectionHead title="Payment" sub="Connect Stripe to accept deposits and checkout payments." />
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: "hsl(215,25%,18%)", borderColor: "hsl(215,25%,24%)" }}>
        <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: "hsl(215,28%,14%)", borderColor: "hsl(215,25%,24%)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(230,60%,55%,0.15)" }}>
            <CreditCard className="w-5 h-5" style={{ color: "hsl(230,60%,65%)" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Stripe</p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(215,20%,50%)" }}>
              Connect your Stripe account to accept card payments and manage payouts.
            </p>
          </div>
          <button
            className="px-4 py-2 rounded-xl border text-xs font-semibold transition-colors"
            style={{ borderColor: "hsl(215,25%,32%)", color: "hsl(215,20%,65%)" }}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Staff Tab ──────────────────────────────────────────────────────────────────
function StaffTab({ restaurantId: _restaurantId, smsActive, emailActive }: {
  restaurantId: string; smsActive: boolean; emailActive: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <SectionHead title="Staff & Notifications" sub="Manage your team and configure SMS/email automations." />
      <div className="space-y-3">
        {[
          { label: "SMS Reminders", sub: "Twilio · Appointment confirmations & reminders", active: smsActive, path: "/notifications" },
          { label: "Email Blast & Reminders", sub: "Resend · Transactional & marketing emails", active: emailActive, path: "/notifications" },
        ].map(({ label, sub, active, path }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all"
            style={{ background: "hsl(215,25%,18%)", borderColor: "hsl(215,25%,24%)" }}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-500 animate-pulse-dot" : ""}`}
              style={!active ? { background: "hsl(215,20%,35%)" } : {}}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215,20%,50%)" }}>{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "hsl(215,20%,40%)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
export function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="text-sm mt-1 leading-relaxed" style={{ color: "hsl(215,20%,55%)" }}>{sub}</p>
    </div>
  );
}
