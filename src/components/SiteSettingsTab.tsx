import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Globe, Copy, CheckCheck, CircleAlert as AlertCircle, ExternalLink, Server, Lock, CircleCheck as CheckCircle2, Circle, RefreshCw, Wifi, Circle as XCircle } from "lucide-react";
import type { RestaurantSettings } from "@/hooks/useRestaurantSettings";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useDemoMode } from "@/contexts/DemoModeContext";

const SUBDOMAIN_HOST = "loomishq.com";
const VERCEL_IP = "216.198.79.1";
const VERCEL_CNAME = "cname.vercel-dns.com";
const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-vercel-domain`;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isVercelProduction(): boolean {
  const host = window.location.hostname;
  if (host === SUBDOMAIN_HOST || host.endsWith(`.${SUBDOMAIN_HOST}`)) return true;
  if (host.endsWith(".vercel.app")) return true;
  return false;
}

function getLiveUrl(settings: RestaurantSettings): string {
  if (settings.custom_domain?.trim()) return `https://${settings.custom_domain.trim()}`;
  const sub = settings.subdomain?.trim();
  if (sub) return `https://${sub}.${SUBDOMAIN_HOST}`;
  return `${window.location.origin}/?test_res_id=${settings.id}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 transition-colors flex-shrink-0"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DnsRow({ type, host, value }: { type: string; host: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm border border-border rounded-lg p-3 bg-secondary/30">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider col-span-2 mb-1 flex items-center gap-2">
        <span className="bg-gold/20 text-gold font-mono px-1.5 py-0.5 rounded text-[10px]">{type}</span>
        record
      </span>
      <span className="text-xs text-muted-foreground w-12">Host</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="font-mono text-xs text-foreground truncate">{host}</code>
        <CopyButton value={host} />
      </div>
      <span className="text-xs text-muted-foreground w-12">Value</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className="font-mono text-xs text-foreground truncate">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {done
        ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        : <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
      <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

type Props = {
  settings: RestaurantSettings;
  menuItemCount?: number;
};

export default function SiteSettingsTab({ settings, menuItemCount = 0 }: Props) {
  const qc = useQueryClient();
  const demo = useDemoMode();

  if (demo) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-secondary/40 p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Not Available in Demo</p>
            <p className="text-xs text-muted-foreground mt-1">
              Custom domain and subdomain configuration requires a live account. Start a free trial to publish your menu at your own URL.
            </p>
          </div>
        </div>
        <div className="text-center py-6 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Your live site URL will appear here once you create an account.</p>
        </div>
      </div>
    );
  }

  const defaultSubdomain = settings.subdomain?.trim() || slugify(settings.business_name || "");

  const [subdomain, setSubdomain] = useState(defaultSubdomain);
  const [customDomain, setCustomDomain] = useState(settings.custom_domain ?? "");
  const [saving, setSaving] = useState(false);
  const [subdomainError, setSubdomainError] = useState("");
  const [savedLiveUrl, setSavedLiveUrl] = useState(() => getLiveUrl(settings));
  const [customDomainManual, setCustomDomainManual] = useState(
    !!(settings.custom_domain && settings.custom_domain !== `${settings.subdomain}.com`)
  );
  const [domainVerified, setDomainVerified] = useState<boolean | null>(
    settings.custom_domain_verified ?? null
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const clean = settings.subdomain?.trim() || slugify(settings.business_name || "");
    setSubdomain(clean);
    setCustomDomain(settings.custom_domain ?? "");
    setSavedLiveUrl(getLiveUrl(settings));
    setDomainVerified(
      settings.custom_domain_verified ?? null
    );
  }, [settings.subdomain, settings.custom_domain, settings.business_name, settings.id]);

  const handleSubdomainChange = (val: string) => {
    const slug = slugify(val);
    setSubdomain(slug);
    setSubdomainError("");
    if (!customDomainManual) {
      setCustomDomain(slug ? `${slug}.com` : "");
    }
  };

  const handleCustomDomainChange = (val: string) => {
    setCustomDomainManual(true);
    setCustomDomain(val.trim());
  };

  const registerDomainWithVercel = async (domain: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await fetch(EDGE_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ domain }),
      });
      const body = await res.json();
      if (!res.ok && !body.alreadyRegistered) {
        console.warn("Vercel domain registration:", body.error);
      }
    } catch (e) {
      console.warn("Vercel domain registration failed silently:", e);
    }
  };

  const handleVerifyConnection = async () => {
    const domain = (settings.custom_domain ?? "").trim();
    if (!domain) return;
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${EDGE_FN_URL}?domain=${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();

      if (!res.ok) {
        toast.error(`Verification failed: ${body.error ?? "Unknown error"}`);
        return;
      }

      const verified = body.verified === true;
      setDomainVerified(verified);

      await supabase
        .from("restaurant_settings")
        .update({ custom_domain_verified: verified })
        .eq("id", settings.id);

      qc.invalidateQueries({ queryKey: ["restaurant-settings"] });

      if (verified) {
        toast.success("Domain is live! DNS is fully propagated and verified.");
      } else {
        toast.info("DNS not yet propagated. This can take up to 48 hours after adding records.");
      }
    } catch {
      toast.error("Connection check failed — please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!subdomain.trim()) {
      setSubdomainError("Subdomain is required");
      return;
    }
    if (subdomain.length < 3) {
      setSubdomainError("Must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      // Normalize: strip protocol, www., and trailing slashes so we always store the bare hostname
      const newCustomDomain = customDomain.trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/+$/, "") || null;
      const prevCustomDomain = settings.custom_domain?.trim() || null;
      const domainChanged = newCustomDomain !== prevCustomDomain;

      const updatePayload: Record<string, unknown> = {
        subdomain: subdomain.trim() || null,
        custom_domain: newCustomDomain,
      };
      if (domainChanged) updatePayload.custom_domain_verified = false;

      const { data: updated, error } = await supabase
        .from("restaurant_settings")
        .update(updatePayload)
        .eq("id", settings.id)
        .select("id, subdomain, custom_domain");

      if (error) {
        if (error.message.includes("subdomain")) {
          setSubdomainError("This subdomain is already taken");
        } else if (error.message.includes("custom_domain")) {
          toast.error("That custom domain is already registered");
        } else {
          throw error;
        }
        return;
      }

      if (!updated || updated.length === 0) {
        toast.error("Save failed — your session may have expired. Please log out and back in.");
        return;
      }

      if (domainChanged && newCustomDomain) {
        setDomainVerified(false);
        // Register both naked + www with Vercel in the background
        registerDomainWithVercel(newCustomDomain);
      }

      setSavedLiveUrl(getLiveUrl({ ...settings, subdomain, custom_domain: newCustomDomain || settings.custom_domain } as RestaurantSettings));

      qc.invalidateQueries({ queryKey: ["restaurant-settings"] });
      toast.success("Domain settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const onVercel = isVercelProduction();
  const profileSet = !!(settings.business_name?.trim() && settings.business_phone?.trim());
  const menuReady = menuItemCount > 0;
  const domainSet = !!settings.subdomain?.trim();
  const allGreen = profileSet && menuReady && domainSet;
  const savedCustomDomain = settings.custom_domain?.trim() ?? "";

  return (
    <div className="space-y-8">

      {/* Launch Readiness Checklist */}
      <div className={`rounded-lg border p-4 space-y-3 transition-colors ${allGreen ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-secondary/30"}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Launch Readiness</p>
          {allGreen && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">All systems go</span>
          )}
        </div>
        <div className="space-y-2">
          <ChecklistItem done={profileSet} label="Profile Set — business name & phone added" />
          <ChecklistItem done={menuReady} label={`Menu Ready — ${menuItemCount} item${menuItemCount === 1 ? "" : "s"} on the menu`} />
          <ChecklistItem done={domainSet} label={`Domain Set — subdomain saved${domainSet ? ` (${settings.subdomain})` : ""}`} />
        </div>
        {allGreen && (
          <div className="pt-2 border-t border-emerald-500/20 text-center">
            <p className="text-sm font-bold text-emerald-400">Your Restaurant is Live!</p>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Site Identity</h3>
        <p className="text-xs text-muted-foreground">
          Configure your restaurant's public URL and custom domain.
        </p>
      </div>

      {/* Current live URL banner */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Your current working URL</p>
        <a
          href={savedLiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-gold hover:text-gold/80 transition-colors break-all"
        >
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          {savedLiveUrl}
        </a>
        {!onVercel && (
          <p className="text-xs text-muted-foreground">
            Running in preview mode — this link uses your restaurant ID. Deploy to Vercel to activate your subdomain URL.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {/* Subdomain */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">
            Subdomain <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground -mt-0.5">
            Your restaurant's free hosted address. Only lowercase letters, numbers, and hyphens.
          </p>
          <div className={`flex items-center rounded-md border overflow-hidden transition-colors ${subdomainError ? "border-destructive" : "border-border focus-within:border-gold/60"}`}>
            <span className="bg-muted/60 px-3 py-2 text-xs text-muted-foreground border-r border-border whitespace-nowrap font-mono select-none">
              https://
            </span>
            <Input
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              placeholder="your-restaurant-name"
              className="rounded-none border-0 bg-secondary focus-visible:ring-0 font-mono text-sm flex-1 min-w-0 placeholder:text-muted-foreground/40"
            />
            <span className="bg-muted/60 px-3 py-2 text-xs text-muted-foreground border-l border-border whitespace-nowrap font-mono select-none">
              .{SUBDOMAIN_HOST}
            </span>
          </div>
          {subdomainError && (
            <p className="text-destructive text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {subdomainError}
            </p>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Custom Domain */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-muted-foreground text-xs">Custom Domain (optional)</Label>
            {savedCustomDomain && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                domainVerified
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${domainVerified ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                {domainVerified ? "Live" : "Pending DNS"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-0.5">
            Use your own domain (e.g. <code className="font-mono">menu.joesdiner.com</code>).
            Save first, then add the DNS records below at your registrar.
          </p>
          <Input
            value={customDomain}
            onChange={(e) => handleCustomDomainChange(e.target.value)}
            placeholder="www.your-restaurant-name.com"
            className="bg-secondary border-border font-mono text-sm placeholder:text-muted-foreground/40"
          />

          {/* Verify Connection button — only shown when a domain is saved in DB */}
          {savedCustomDomain && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifyConnection}
              disabled={checking}
              className={`w-full mt-1 text-xs transition-colors ${
                domainVerified
                  ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {checking
                ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                : <Wifi className="w-3.5 h-3.5 mr-2" />}
              {checking
                ? "Checking..."
                : domainVerified
                  ? "Re-verify Connection"
                  : "Verify Connection"}
            </Button>
          )}
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gradient-gold text-primary-foreground font-semibold"
      >
        <Globe className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Domain Settings"}
      </Button>

      {/* DNS Configuration */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">DNS Configuration</h3>
        </div>

        {/* Free subdomain */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Free Subdomain</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your free <code className="font-mono">.{SUBDOMAIN_HOST}</code> address is handled automatically — no DNS changes needed.
              It becomes active once your subdomain is saved above.
            </p>
          </div>
          {subdomain && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 flex items-center justify-between gap-2">
              <code className="font-mono text-xs text-foreground">https://{subdomain}.{SUBDOMAIN_HOST}</code>
              <CopyButton value={`https://${subdomain}.${SUBDOMAIN_HOST}`} />
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Custom domain DNS records */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Custom Domain DNS Records</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customDomain.trim()
                ? <>Point <code className="font-mono">{customDomain.trim()}</code> to Loomis by adding these records at your domain registrar.</>
                : "Enter a custom domain above to see the exact DNS records to add at your registrar."}
            </p>
          </div>

          {customDomain.trim() ? (() => {
            const domain = customDomain.trim();
            const isWww = domain.startsWith("www.");
            const isSubdomain = domain.split(".").length > 2;
            return (
              <div className="space-y-3">
                {isWww || !isSubdomain ? (
                  <>
                    <DnsRow type="A" host="@" value={VERCEL_IP} />
                    <DnsRow type="CNAME" host="www" value={VERCEL_CNAME} />
                  </>
                ) : (
                  <DnsRow type="CNAME" host={domain.split(".")[0]} value={VERCEL_CNAME} />
                )}
              </div>
            );
          })() : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Globe className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">DNS records will appear here once you enter a custom domain.</p>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-400">Tips for your DNS provider</p>
          <ul className="text-xs text-amber-400/80 space-y-0.5 list-disc list-inside">
            <li>Set <strong>TTL</strong> to <code className="font-mono">Auto</code> or <code className="font-mono">3600</code></li>
            <li>Disable any proxy (e.g. Cloudflare orange cloud) until DNS is verified</li>
            <li>In Wix: <strong>Domains → DNS Records</strong></li>
            <li>In GoDaddy: <strong>DNS → Manage Zones</strong></li>
            <li>Changes can take up to 48 hours to propagate</li>
          </ul>
        </div>

        <a
          href="https://dnschecker.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Check DNS propagation at dnschecker.org
        </a>
      </div>


    </div>
  );
}
