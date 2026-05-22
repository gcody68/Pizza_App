const heroDefault = "https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=1920";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { MapPin, Phone } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";

export default function HeroSection({ restaurantId }: { restaurantId?: string | null }) {
  const { data: settings } = useRestaurantSettings(restaurantId);
  const { isAdmin } = useAdmin();
  const heroImage = settings === undefined ? null : (settings?.header_image_url || heroDefault);

  return (
    <section className="relative overflow-hidden" style={{ height: "42vh", minHeight: "280px" }}>
      {heroImage && (
        <img
          src={heroImage}
          alt={settings?.business_name || "Salon"}
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
      )}
      {/* Warm-tone gradient overlay — taupe/cream, not pure black */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(62,42,28,0.75) 0%, rgba(62,42,28,0.25) 55%, transparent 100%)" }} />

      <div className="relative z-10 flex flex-col justify-end h-full px-5 pb-7 md:px-10">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white drop-shadow-lg leading-tight mb-2">
          {settings?.business_name || "Salon"}
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
