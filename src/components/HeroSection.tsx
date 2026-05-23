const heroDefault = "https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=1920";
import { useRestaurantSettings, isSalonBusiness } from "@/hooks/useRestaurantSettings";
import { MapPin, Phone } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";

export default function HeroSection({ restaurantId }: { restaurantId?: string | null }) {
  const { data: settings } = useRestaurantSettings(restaurantId);
  const { isAdmin } = useAdmin();
  const salon = isSalonBusiness(settings);
  const heroImage = settings === undefined ? null : (settings?.header_image_url || heroDefault);

  // ── Salon: narrow accent banner + clean typographic block below ──────────
  if (salon) {
    return (
      <>
        {/* Narrow accent banner — image only, no text */}
        <div className="w-full overflow-hidden" style={{ height: "22vh", minHeight: "120px", maxHeight: "200px" }}>
          {heroImage ? (
            <img
              src={heroImage}
              alt={settings?.business_name || "Salon"}
              className="w-full h-full object-cover object-center"
              style={{ display: "block" }}
              width={1920}
              height={400}
            />
          ) : (
            <div style={{ background: "hsl(38,22%,88%)", width: "100%", height: "100%" }} />
          )}
        </div>

        {/* Typographic identity block beneath the banner */}
        <div
          className="w-full px-5 md:px-10"
          style={{
            background: "hsl(38,25%,97%)",
            borderBottom: "1px solid hsl(38,18%,90%)",
            paddingTop: "20px",
            paddingBottom: "18px",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontSize: "clamp(1.35rem, 4vw, 1.9rem)",
              fontWeight: 600,
              color: "hsl(210,12%,14%)",
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {settings?.business_name || "Salon"}
          </h1>

          {(settings?.business_address || settings?.business_phone) && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2">
              {settings?.business_address && (
                <span className="flex items-center gap-1.5" style={{ color: "hsl(210,8%,52%)", fontSize: "0.72rem", letterSpacing: "0.01em" }}>
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: "hsl(30,38%,55%)" }} />
                  {settings.business_address}
                </span>
              )}
              {settings?.business_phone && (
                <a
                  href={`tel:${settings.business_phone}`}
                  className="flex items-center gap-1.5 transition-colors"
                  style={{ color: "hsl(210,8%,52%)", fontSize: "0.72rem", letterSpacing: "0.01em" }}
                >
                  <Phone className="w-3 h-3 shrink-0" style={{ color: "hsl(30,38%,55%)" }} />
                  {settings.business_phone}
                </a>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Restaurant: original full-height hero ────────────────────────────────
  return (
    <section className="relative overflow-hidden" style={{ height: "42vh", minHeight: "280px" }}>
      {heroImage && (
        <img
          src={heroImage}
          alt={settings?.business_name || "Restaurant"}
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
      )}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(62,42,28,0.75) 0%, rgba(62,42,28,0.25) 55%, transparent 100%)" }} />
      <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-7 md:px-10">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white drop-shadow-lg leading-tight mb-2">
          {settings?.business_name || "Restaurant"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {settings?.business_address && (
            <p className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(38,65%,72%)" }} />
              {settings.business_address}
            </p>
          )}
          {settings?.business_phone && (
            <a href={`tel:${settings.business_phone}`} className="flex items-center gap-1.5 text-white/80 text-xs drop-shadow hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(38,65%,72%)" }} />
              {settings.business_phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
