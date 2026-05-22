import { useAdmin } from "@/contexts/AdminContext";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { useLightMode } from "@/hooks/useLightMode";
import { Settings, Shield, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLoginModal from "./AdminLoginModal";

type Props = { showAdmin?: boolean; onToggleAdmin?: () => void; restaurantId?: string | null; isSalon?: boolean };

export default function AppNavbar({ showAdmin, onToggleAdmin, restaurantId, isSalon }: Props) {
  const { isAdmin } = useAdmin();
  const { data: settings } = useRestaurantSettings(restaurantId);
  const { isLight, toggle: toggleLight } = useLightMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  const navStyle = isSalon
    ? { background: "rgba(250,247,242,0.95)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid hsl(38,18%,90%)" }
    : { background: "rgba(18, 14, 10, 0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.08)" };

  const nameColor = isSalon ? "hsl(210,12%,16%)" : "hsl(43,72%,55%)";
  const iconColor = isSalon ? "hsl(210,10%,45%)" : undefined;

  return (
    <>
      <nav className="sticky top-0 z-50" style={navStyle}>
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          {/* Logo — left-aligned on desktop, centered on mobile */}
          <div className="flex-1 flex items-center justify-center md:justify-start">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.business_name || "Logo"}
                style={{ maxHeight: "60px", maxWidth: "200px", width: "auto", height: "auto", objectFit: "contain", display: "block" }}
              />
            ) : (
              <span className="font-serif text-xl font-semibold truncate" style={{ color: nameColor, fontFamily: "'Playfair Display', Georgia, serif" }}>
                {settings?.business_name || "Salon"}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isSalon && (
              <button onClick={toggleLight} className="p-2 rounded-md text-muted-foreground hover:text-gold transition-colors" aria-label="Toggle light/dark mode">
                {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-md transition-colors"
                style={{ color: iconColor || "hsl(43,72%,55%)" }}
                title="Go to Dashboard"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setLoginOpen(true)}
                className="p-2 transition-colors"
                style={{ color: iconColor ? `${iconColor}66` : "rgba(180,160,130,0.4)" }}
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>
      <AdminLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
