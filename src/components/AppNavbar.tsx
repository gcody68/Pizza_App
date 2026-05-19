import { useAdmin } from "@/contexts/AdminContext";
import { useRestaurantSettings } from "@/hooks/useRestaurantSettings";
import { useLightMode } from "@/hooks/useLightMode";
import { Settings, Shield, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLoginModal from "./AdminLoginModal";

type Props = { showAdmin?: boolean; onToggleAdmin?: () => void; restaurantId?: string | null };

export default function AppNavbar({ showAdmin, onToggleAdmin, restaurantId }: Props) {
  const { isAdmin } = useAdmin();
  const { data: settings } = useRestaurantSettings(restaurantId);
  const { isLight, toggle: toggleLight } = useLightMode();
  const [loginOpen, setLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/10" style={{ background: "rgba(18, 14, 10, 0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          {/* Logo — left-aligned on desktop, centered on mobile */}
          <div className="flex-1 flex items-center justify-center md:justify-start">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.business_name || "Logo"}
                style={{
                  maxHeight: "60px",
                  maxWidth: "200px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  imageRendering: "crisp-edges",
                }}
              />
            ) : (
              <span className="font-serif text-xl font-semibold text-gold truncate" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {settings?.business_name || "Restaurant"}
              </span>
            )}
          </div>

          {/* Actions — right-aligned, vertically centered */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={toggleLight}
              className="p-2 rounded-md text-muted-foreground hover:text-gold transition-colors"
              aria-label="Toggle light/dark mode"
            >
              {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-md transition-colors text-muted-foreground hover:text-gold"
                title="Go to Dashboard"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            {!isAdmin && (
              <button
                onClick={() => setLoginOpen(true)}
                className="p-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
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
