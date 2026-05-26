import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Scissors, MessageSquare, Mail, ChevronDown, Zap, Bell, Clock, UserX, Star, Megaphone, Send, Phone, AtSign, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, ExternalLink, Info, Loader as Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRestaurantSettings, useUpdateSettings, type RestaurantSettings } from "@/hooks/useRestaurantSettings";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type SettingsKey = keyof RestaurantSettings;

interface SMSEvent {
  key: SettingsKey;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresMaster?: boolean;
}

interface EmailEvent {
  key: SettingsKey;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

// ── Event definitions ─────────────────────────────────────────────────────────
const SMS_EVENTS: SMSEvent[] = [
  {
    key: "sms_appointment_confirmation",
    label: "Appointment Confirmation",
    description: "Sends immediately when a client books. Includes date, time, and stylist name.",
    icon: CheckCircle2,
  },
  {
    key: "sms_24h_reminder",
    label: "24-Hour Reminder",
    description: "Automated reminder the day before the appointment. Reduces no-shows by up to 40%.",
    icon: Clock,
  },
  {
    key: "sms_2h_reminder",
    label: "2-Hour Reminder",
    description: "Final nudge so clients have time to confirm, cancel, or reschedule.",
    icon: Bell,
  },
  {
    key: "sms_no_show_followup",
    label: "No-Show Follow-Up",
    description: "Sent 30 minutes after a missed appointment — gently offers to rebook.",
    icon: UserX,
  },
];

const EMAIL_EVENTS: EmailEvent[] = [
  {
    key: "email_appointment_confirmation",
    label: "Appointment Confirmations",
    description: "Branded confirmation email with appointment details, stylist info, and a cancel link.",
    icon: CheckCircle2,
  },
  {
    key: "email_24h_reminder",
    label: "24-Hour Reminders",
    description: "Reminder email with directions, parking tips, and a prep checklist.",
    icon: Clock,
  },
  {
    key: "email_marketing_blasts",
    label: "Email Marketing Blasts",
    description: "Send seasonal promotions, new service announcements, and loyalty offers.",
    icon: Megaphone,
    badge: "Coming soon",
  },
  {
    key: "email_review_request",
    label: "Post-Visit Review Request",
    description: "Sent 2 hours after checkout — asks for a Google or Yelp review.",
    icon: Star,
    badge: "Coming soon",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-stone-800">{label}</h2>
      <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{sub}</p>
    </div>
  );
}

function ToggleRow({
  label, description, icon: Icon, checked, onToggle, saving, disabled, badge,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  checked: boolean;
  onToggle: () => void;
  saving: boolean;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
      checked && !disabled
        ? "border-[hsl(38,65%,55%)]/30 bg-[hsl(38,65%,55%)]/5"
        : "border-stone-100 bg-white"
    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
        checked && !disabled ? "bg-[hsl(38,65%,55%)]/15" : "bg-stone-100"
      }`}>
        <Icon className={`w-4.5 h-4.5 ${checked && !disabled ? "text-[hsl(38,65%,55%)]" : "text-stone-500"}`} style={{ width: 18, height: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-stone-800">{label}</p>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 pt-0.5">
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
        ) : (
          <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
        )}
      </div>
    </div>
  );
}

function MasterChannelBanner({
  enabled, onToggle, saving, label, providerLabel, providerUrl, accentColor,
}: {
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  label: string;
  providerLabel: string;
  providerUrl: string;
  accentColor: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all mb-6 ${
      enabled ? "border-emerald-500/40 bg-emerald-500/5" : "border-stone-200 bg-stone-50"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`} />
          <p className="text-sm font-bold text-stone-800">{label}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            enabled ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700" : "bg-stone-100 border-stone-200 text-stone-500"
          }`}>
            {enabled ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="text-[11px] text-stone-400 mt-1">
          Powered by{" "}
          <a href={providerUrl} target="_blank" rel="noopener noreferrer"
            className="font-semibold hover:underline inline-flex items-center gap-0.5"
            style={{ color: accentColor }}
          >
            {providerLabel} <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {" "}— configure API keys in your environment.
        </p>
      </div>
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-stone-400 flex-shrink-0" />
      ) : (
        <Switch checked={enabled} onCheckedChange={onToggle} className="flex-shrink-0" />
      )}
    </div>
  );
}

function TextInput({
  label, description, value, onChange, onBlur, placeholder, icon: Icon,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-stone-100 bg-white">
      <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="text-stone-500" style={{ width: 18, height: 18 }} />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <p className="text-sm font-semibold text-stone-800">{label}</p>
          <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-[hsl(38,65%,55%)]/60 focus:bg-white transition-all"
        />
      </div>
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({
  id, activeSection, onToggle, icon: Icon, title, subtitle, statusDot, children,
}: {
  id: string;
  activeSection: string | null;
  onToggle: (id: string) => void;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  statusDot: "active" | "inactive" | "partial";
  children: React.ReactNode;
}) {
  const isOpen = activeSection === id;
  const dotColor = { active: "bg-emerald-500", inactive: "bg-stone-300", partial: "bg-amber-400" }[statusDot];
  const dotLabel = { active: "Active", inactive: "Off", partial: "Partial" }[statusDot];

  return (
    <div className={`rounded-2xl border transition-all ${isOpen ? "border-stone-200 shadow-sm" : "border-stone-100"} bg-white overflow-hidden`}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50/80 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isOpen ? "bg-[hsl(38,65%,55%)]/15" : "bg-stone-100"}`}>
          <Icon className={`${isOpen ? "text-[hsl(38,65%,55%)]" : "text-stone-500"}`} style={{ width: 20, height: 20 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-stone-800">{title}</p>
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              statusDot === "active"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700"
                : statusDot === "partial"
                ? "bg-amber-500/10 border-amber-500/25 text-amber-700"
                : "bg-stone-100 border-stone-200 text-stone-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {dotLabel}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">{subtitle}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-stone-300 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-stone-50 space-y-3 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NotificationsSettings() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useRestaurantSettings();
  const restaurantId = settings?.id ?? "";
  const update = useUpdateSettings(restaurantId);

  const [activeSection, setActiveSection] = useState<string | null>("sms");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Local mirror of settings for optimistic UI
  const [local, setLocal] = useState<Partial<RestaurantSettings>>({});

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const getBool = (key: SettingsKey): boolean => !!(local[key] ?? settings?.[key] ?? false);
  const getString = (key: SettingsKey): string => ((local[key] ?? settings?.[key] ?? "") as string);

  const saveField = async (key: string, value: boolean | string) => {
    if (!restaurantId) { toast.error("No salon profile found"); return; }
    setSavingKey(key);
    setLocal((prev) => ({ ...prev, [key]: value }));
    try {
      await update.mutateAsync({ [key]: value } as Partial<RestaurantSettings>);
      toast.success("Saved");
    } catch {
      setLocal((prev) => ({ ...prev, [key]: settings?.[key as keyof RestaurantSettings] }));
      toast.error("Failed to save");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleSection = (id: string) =>
    setActiveSection((prev) => (prev === id ? null : id));

  // Derive status dots
  const smsBoolKeys: SettingsKey[] = ["sms_appointment_confirmation", "sms_24h_reminder", "sms_2h_reminder", "sms_no_show_followup"];
  const emailBoolKeys: SettingsKey[] = ["email_appointment_confirmation", "email_24h_reminder", "email_marketing_blasts", "email_review_request"];

  const smsActive = getBool("sms_enabled");
  const smsAnyOn = smsBoolKeys.some((k) => getBool(k));
  const emailActive = getBool("email_enabled");
  const emailAnyOn = emailBoolKeys.some((k) => getBool(k));

  const smsStatus = !smsActive ? "inactive" : smsAnyOn ? "active" : "partial";
  const emailStatus = !emailActive ? "inactive" : emailAnyOn ? "active" : "partial";

  // Count active notifications for the header summary
  const totalActive = [...smsBoolKeys, ...emailBoolKeys].filter((k) => getBool(k)).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#faf9f7", fontFamily: "'Inter', sans-serif" }}>

      {/* Navbar */}
      <header className="flex-shrink-0 bg-white border-b border-stone-100 px-4 lg:px-6 h-14 flex items-center gap-3 z-10">
        <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-stone-400" />
          <span className="text-sm font-semibold text-stone-800">Loomis Salon</span>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">Notifications</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">

        {/* Page header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-stone-800">Notification Settings</h1>
              <p className="text-sm text-stone-400 mt-1 leading-relaxed">
                Configure automated SMS and email touchpoints for your clients. Changes take effect immediately.
              </p>
            </div>
            {totalActive > 0 && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl gradient-gold text-white shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{totalActive} active</span>
              </div>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-amber-200/60 bg-amber-50/60">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700 leading-relaxed space-y-0.5">
            <p className="font-semibold">API keys required for live sending</p>
            <p>
              Add <code className="font-mono bg-amber-100 px-1 rounded">TWILIO_*</code> vars for SMS and{" "}
              <code className="font-mono bg-amber-100 px-1 rounded">RESEND_API_KEY</code> for email in your Supabase Edge Function secrets. These toggles are fully wired — enabling them will send real messages once keys are present.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-stone-300" />
          </div>
        )}

        {!isLoading && (
          <div className="space-y-4">

            {/* ── SMS Section ── */}
            <CollapsibleSection
              id="sms"
              activeSection={activeSection}
              onToggle={toggleSection}
              icon={MessageSquare}
              title="SMS Reminders"
              subtitle="Text message automations via Twilio"
              statusDot={smsStatus}
            >
              <div className="pt-3 space-y-4">
                <SectionHeader
                  label="SMS Channel"
                  sub="Turn on the master switch to enable any SMS sends. Individual events can be configured below."
                />

                <MasterChannelBanner
                  enabled={getBool("sms_enabled")}
                  onToggle={() => saveField("sms_enabled", !getBool("sms_enabled"))}
                  saving={savingKey === "sms_enabled"}
                  label="SMS Notifications"
                  providerLabel="Twilio"
                  providerUrl="https://www.twilio.com"
                  accentColor="hsl(200, 90%, 45%)"
                />

                <TextInput
                  label="Outbound Phone Number"
                  description="Your Twilio sender number in E.164 format. Clients will see this as the sender."
                  value={getString("twilio_phone_number")}
                  onChange={(v) => setLocal((p) => ({ ...p, twilio_phone_number: v }))}
                  onBlur={() => saveField("twilio_phone_number", getString("twilio_phone_number"))}
                  placeholder="+13125550100"
                  icon={Phone}
                />

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">Trigger Events</p>
                  {SMS_EVENTS.map((evt) => (
                    <ToggleRow
                      key={evt.key}
                      label={evt.label}
                      description={evt.description}
                      icon={evt.icon}
                      checked={getBool(evt.key)}
                      onToggle={() => saveField(evt.key, !getBool(evt.key))}
                      saving={savingKey === evt.key}
                      disabled={!getBool("sms_enabled")}
                    />
                  ))}
                </div>

                <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-stone-50 border border-stone-100">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    SMS messages count against your Twilio usage. Standard carrier rates may apply to your clients.
                    Message templates are editable via the Twilio console.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* ── Email Section ── */}
            <CollapsibleSection
              id="email"
              activeSection={activeSection}
              onToggle={toggleSection}
              icon={Mail}
              title="Email Blast & Reminders"
              subtitle="Transactional + marketing emails via Resend"
              statusDot={emailStatus}
            >
              <div className="pt-3 space-y-4">
                <SectionHeader
                  label="Email Channel"
                  sub="Enable the channel to activate transactional emails and permission-based marketing blasts."
                />

                <MasterChannelBanner
                  enabled={getBool("email_enabled")}
                  onToggle={() => saveField("email_enabled", !getBool("email_enabled"))}
                  saving={savingKey === "email_enabled"}
                  label="Email Notifications"
                  providerLabel="Resend"
                  providerUrl="https://resend.com"
                  accentColor="hsl(0, 72%, 51%)"
                />

                <TextInput
                  label="Reply-To Address"
                  description="Clients who reply to automated emails will reach this inbox. Use your salon's main email."
                  value={getString("reply_to_email")}
                  onChange={(v) => setLocal((p) => ({ ...p, reply_to_email: v }))}
                  onBlur={() => saveField("reply_to_email", getString("reply_to_email"))}
                  placeholder="hello@loomissalon.com"
                  icon={AtSign}
                />

                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">Trigger Events</p>
                  {EMAIL_EVENTS.map((evt) => (
                    <ToggleRow
                      key={evt.key}
                      label={evt.label}
                      description={evt.description}
                      icon={evt.icon}
                      checked={getBool(evt.key)}
                      onToggle={() => saveField(evt.key, !getBool(evt.key))}
                      saving={savingKey === evt.key}
                      disabled={!getBool("email_enabled")}
                      badge={evt.badge}
                    />
                  ))}
                </div>

                <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-stone-50 border border-stone-100">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    Email templates are branded with your salon name and logo. Marketing blasts require
                    explicit client opt-in and include an unsubscribe link per CAN-SPAM requirements.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

          </div>
        )}

        {/* Footer — hook status */}
        <div className="rounded-2xl border border-stone-100 bg-white p-5 space-y-3">
          <p className="text-xs font-semibold text-stone-700 flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-stone-400" />
            Integration Readiness
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                provider: "Twilio (SMS)",
                hook: "supabase/functions/send-sms",
                ready: false,
                vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"],
                url: "https://www.twilio.com/console",
              },
              {
                provider: "Resend (Email)",
                hook: "supabase/functions/send-email",
                ready: false,
                vars: ["RESEND_API_KEY", "RESEND_FROM_DOMAIN"],
                url: "https://resend.com/api-keys",
              },
            ].map(({ provider, hook, ready, vars, url }) => (
              <div key={provider} className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-stone-700">{provider}</p>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    ready
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700"
                      : "bg-stone-100 border-stone-200 text-stone-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ready ? "bg-emerald-500" : "bg-stone-300"}`} />
                    {ready ? "Keys set" : "Needs keys"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">{hook}</p>
                <div className="space-y-1">
                  {vars.map((v) => (
                    <div key={v} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                      <span className="text-[10px] font-mono text-stone-500">{v}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[hsl(38,65%,55%)] hover:underline"
                >
                  Get API keys <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
